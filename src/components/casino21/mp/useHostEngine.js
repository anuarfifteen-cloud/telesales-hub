import { useCallback, useEffect, useRef, useState } from "react";
import { handValue } from "../blackjackDeck";
import {
  MIN_BET,
  TURN_MS,
  COMPLETED_AUTO_MS,
  AUTO_BET_GRACE_MS,
  BETTING_MS,
  MIN_PLAYERS_TO_DEAL,
  normalizeSeats,
  isCommitted,
  applyNextAction,
  resolvePot,
  cleanSeats,
  emptySeat,
  newRoundId,
  nextDealtInSeat,
  buildDeal,
  hostUserIdForSeats,
  applyJoinToSeats,
  STALE_ACTION_MS,
} from "./mpEngine";
import { fetchPendingActions, deleteAction } from "./tableActions";
import {
  shouldRunEngine,
  needsLeaseWrite,
  LEASE_MS,
  PRESENCE_TIMEOUT_MS,
} from "./hostLease";

// The table engine. Runs on whichever client currently holds the host lease,
// once a second, and only while the tab is visible. The lease holder is the
// SOLE writer of the ActiveTable row for game actions — players INSERT
// TableAction records (JOIN, LEAVE, ACCEPT_BET, DECLINE_BET, HIT, STAND,
// HEARTBEAT) and the host applies each one to the table and deletes it.
//
// The lease is renewed every few ticks. When the holder closes their tab the
// lease expires and the lowest-numbered seated player claims it, so processing
// never stops as long as any player is active. Presence heartbeats let the
// engine tell connected-but-idle players apart from players whose browsers are
// gone, so only truly-absent seats are freed.
export default function useHostEngine({ table, patch, user, onQueueError }) {
  const ref = useRef({});
  ref.current = { table, patch, user, onQueueError };
  const busyRef = useRef(false);
  const [retrySignal, setRetrySignal] = useState(0);

  useEffect(() => {
    const tick = async () => {
      const current = ref.current;
      if (!current.table || !current.user) return;
      if (document.visibilityState !== "visible") return;
      // Only the lease holder runs the engine.
      if (!shouldRunEngine(current.table, current.user, Date.now())) return;
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        await runTick(current);
        // A successful tick clears any surfaced queue error.
        const cb = current.onQueueError;
        if (cb) cb(null);
      } catch (e) {
        console.error("[Multiplayer Host] Tick failed:", e);
      } finally {
        busyRef.current = false;
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [retrySignal]);

  // Manual retry: re-run the engine immediately (used by the host's
  // queue-read warning banner).
  const retryNow = useCallback(() => setRetrySignal((n) => n + 1), []);
  return { retryNow };
}

async function runTick({ table, patch, user, onQueueError }) {
  const now = Date.now();
  let latest = table;

  // Claim or renew the host lease. Only write when the lease needs it (claim
  // or near-expiry) to avoid a write every tick.
  if (needsLeaseWrite(latest, user.id, now)) {
    const claimed = await patch({
      host_user_id: user.id,
      host_lease_expires_at: now + LEASE_MS,
    });
    if (claimed) latest = claimed;
  }

  // 1. Process the action queue. A read failure is surfaced to the host UI so
  //    they can retry — never swallow it as an empty queue, or non-host joins
  //    would silently never apply.
  let actions;
  try {
    actions = await fetchPendingActions(latest.id);
  } catch (e) {
    console.error("[Multiplayer Host] Queue read failed:", e);
    if (onQueueError) onQueueError(e);
    return;
  }
  for (const action of actions) {
    // Purge stale actions: anything older than STALE_ACTION_MS, or (for
    // non-presence gameplay actions) from a previous round, is deleted
    // before processing so it can never apply to the current round. JOIN and
    // HEARTBEAT are exempt — a join must still apply even if the round
    // advanced while it sat in the queue.
    const createdMs = new Date(action.created_date).getTime();
    if (now - createdMs > STALE_ACTION_MS) {
      await deleteAction(action.id);
      continue;
    }
    if (
      action.action_type !== "HEARTBEAT" &&
      action.action_type !== "JOIN" &&
      action.round_id !== latest.round_id
    ) {
      await deleteAction(action.id);
      continue;
    }
    const result = await applyAction(action, latest, patch, now);
    if (result) latest = result;
    await deleteAction(action.id);
  }

  // 2. Run the phase logic on the post-action table state.
  await runPhase(latest, patch, now);
}

// Apply a single queued action to the table. Returns the updated record (from
// the patch) when the table changed, or null when the action was a no-op
// (out-of-turn, wrong phase, already-applied, seat no longer yours). Every
// branch is idempotent so a re-apply after a crash is safe.
async function applyAction(action, table, patch, now) {
  const seats = normalizeSeats(table.seats);
  const status = table.status || "waiting_for_bets";
  const seat = seats.find((s) => Number(s.seat_id) === Number(action.seat_id));
  if (!seat) return null;
  // The action must still belong to the submitter's seat (JOIN is the exception
  // — it claims an empty seat).
  if (action.action_type !== "JOIN" && seat.user_id !== action.user_id) return null;

  // Keep the current host when it is still seated; only reassign when the host
  // left or there was none. This prevents the host from yanking to the lowest
  // seat every time a lower seat joins.
  const resolveHost = (next) => {
    if (table.host_user_id && next.some((s) => s.user_id === table.host_user_id)) {
      return table.host_user_id;
    }
    return hostUserIdForSeats(next) || "";
  };

  if (action.action_type === "HEARTBEAT") {
    if (!seat.user_id || seat.user_id !== action.user_id) return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? { ...s, last_seen: now }
        : s
    );
    return await patch({ seats: next });
  }

  if (action.action_type === "JOIN") {
    if (status !== "waiting_for_bets") return null;
    if (seat.user_id) return null; // seat already taken — drop the action
    const next = applyJoinToSeats(seats, action.seat_id, action.user_id, action.user_name, now);
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "LEAVE") {
    if (status === "player_turns" || status === "settling") {
      // Mid-round leave: forfeit the hand, stand it, mark disconnected so the
      // reveal can proceed. No refund — the bet stays in the pot.
      const next = seats.map((s) =>
        Number(s.seat_id) === Number(action.seat_id)
          ? { ...s, status: "disconnected", ready: true }
          : s
      );
      return await patch({
        seats: next,
        host_user_id: resolveHost(next),
        last_action_timestamp: now,
      });
    }
    // Pre/post-round leave: empty the seat. The player's own client already
    // refunded their wallet if they had a committed bet (no host refund needed).
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id) ? emptySeat(s.seat_id) : s
    );
    const remainingBettors = next.filter((s) => Number(s.bet_chips) > 0);
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      common_wager: remainingBettors.length ? table.common_wager : 0,
      betting_ends_at: remainingBettors.length ? table.betting_ends_at : 0,
      deal_at: remainingBettors.length ? table.deal_at : 0,
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "ACCEPT_BET") {
    if (status !== "waiting_for_bets") return null;
    if (Number(seat.bet_chips) > 0) return null; // already committed
    const wager = Number(action.wager) || MIN_BET;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? { ...s, bet_chips: wager, status: "betting", auto_replay: false, last_activity: now, last_seen: now }
        : s
    );
    const commonWager = Number(table.common_wager) || wager;
    const betting_ends_at = Number(table.betting_ends_at) || (now + BETTING_MS);
    return await patch({
      seats: next,
      common_wager: commonWager,
      betting_ends_at,
      deal_at: 0,
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "DECLINE_BET") {
    if (status !== "waiting_for_bets") return null;
    if (!seat.user_id) return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id) ? emptySeat(s.seat_id) : s
    );
    const remainingBettors = next.filter((s) => Number(s.bet_chips) > 0);
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      common_wager: remainingBettors.length ? table.common_wager : 0,
      betting_ends_at: remainingBettors.length ? table.betting_ends_at : 0,
      deal_at: remainingBettors.length ? table.deal_at : 0,
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "HIT") {
    if (status !== "player_turns") return null;
    if (Number(table.current_turn_seat) !== Number(seat.seat_id)) return null;
    if (seat.status !== "playing") return null;
    const deck = [...(table.deck || [])];
    if (!deck.length) return null;
    const card = deck.pop();
    const cards = [...(seat.cards || []), card];
    const total = handValue(cards);
    const busted = total > 21;
    const twentyOne = total === 21;
    const nextStatus = busted ? "busted" : twentyOne ? "stood" : "playing";
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(seat.seat_id)
        ? { ...s, cards, hand_value: total, status: nextStatus, last_seen: now }
        : s
    );
    if (busted || twentyOne) {
      const nextTurn = nextDealtInSeat(next, seat.seat_id);
      if (nextTurn === null) {
        return await patch({
          seats: next,
          deck,
          status: "settling",
          last_action_timestamp: now,
        });
      }
      return await patch({
        seats: next,
        deck,
        current_turn_seat: nextTurn,
        reveal_deadline: now + TURN_MS,
        last_action_timestamp: now,
      });
    }
    return await patch({
      seats: next,
      deck,
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "STAND") {
    if (status !== "player_turns") return null;
    if (Number(table.current_turn_seat) !== Number(seat.seat_id)) return null;
    if (seat.status !== "playing") return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(seat.seat_id) ? { ...s, status: "stood", last_seen: now } : s
    );
    const nextTurn = nextDealtInSeat(next, seat.seat_id);
    if (nextTurn === null) {
      return await patch({
        seats: next,
        status: "settling",
        last_action_timestamp: now,
      });
    }
    return await patch({
      seats: next,
      current_turn_seat: nextTurn,
      reveal_deadline: now + TURN_MS,
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "CLAIM") {
    if (seat.payout_claimed) return null; // already claimed (idempotent)
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(seat.seat_id)
        ? { ...s, bet_chips: 0, payout_claimed: true, status: "betting" }
        : s
    );
    return await patch({ seats: next, last_action_timestamp: now });
  }

  return null;
}

async function runPhase(table, patch, now) {
  const seats = normalizeSeats(table.seats);
  const seated = seats.filter((s) => s.user_id);
  const status = table.status || "waiting_for_bets";

  // Nobody seated — park the table in a clean waiting state.
  if (seated.length === 0) {
    const dirty =
      status !== "waiting_for_bets" ||
      (table.deck || []).length > 0 ||
      table.betting_ends_at ||
      table.deal_at ||
      table.reveal_deadline ||
      table.common_wager ||
      table.total_pot ||
      table.next_action ||
      Number(table.host_lease_expires_at || 0);
    if (!dirty) return;
    await patch({
      seats: cleanSeats(seats),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      common_wager: 0,
      total_pot: 0,
      next_action: null,
      host_user_id: "",
      host_lease_expires_at: 0,
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "waiting_for_bets") {
    // Presence-based kick: free seats whose browsers have been gone beyond the
    // presence timeout. Only uncommitted bettors are kicked (committed bets
    // stay in the pot and are handled by the deal / turn logic). A connected
    // but idle player (recent heartbeat) is never kicked.
    const stale = seated.filter(
      (s) =>
        s.status !== "disconnected" &&
        !isCommitted(s) &&
        Number(s.last_seen) > 0 &&
        now - Number(s.last_seen) > PRESENCE_TIMEOUT_MS
    );
    if (stale.length) {
      const kicked = new Set(stale.map((s) => s.seat_id));
      const next = seats.map((s) =>
        kicked.has(s.seat_id) ? emptySeat(s.seat_id) : s
      );
      const remainingBettors = next.filter((s) => Number(s.bet_chips) > 0);
      await patch({
        seats: next,
        host_user_id: (table.host_user_id && next.some((s) => s.user_id === table.host_user_id))
          ? table.host_user_id
          : hostUserIdForSeats(next) || "",
        common_wager: remainingBettors.length ? table.common_wager : 0,
        betting_ends_at: remainingBettors.length ? table.betting_ends_at : 0,
        deal_at: remainingBettors.length ? table.deal_at : 0,
        last_action_timestamp: now,
      });
      return;
    }

    const seatedLive = seated.filter((s) => s.status !== "disconnected");
    const bettors = seatedLive
      .filter((s) => isCommitted(s))
      .sort((a, b) => a.seat_id - b.seat_id);

    // Instant-start: once every seated player has committed AND there are
    // enough players, deal immediately — no need to wait for the window.
    if (
      bettors.length >= MIN_PLAYERS_TO_DEAL &&
      bettors.length === seatedLive.length
    ) {
      await dealRound({ seats, bettors, patch, now });
      return;
    }

    const anyWager = seatedLive.some((s) => Number(s.bet_chips) > 0);
    if (!anyWager) return;
    if (!table.betting_ends_at || now < table.betting_ends_at) return;

    // Betting window closed — give auto/late accepts a short grace, then deal
    // to whoever has committed (uncommitted seated players simply sit out).
    if (!table.deal_at) {
      await patch({ deal_at: now + AUTO_BET_GRACE_MS });
      return;
    }
    if (now < table.deal_at) return;

    const finalBettors = seatedLive
      .filter((s) => isCommitted(s))
      .sort((a, b) => a.seat_id - b.seat_id);
    if (finalBettors.length < MIN_PLAYERS_TO_DEAL) {
      // Not enough matchers — refund each committed seat (the settlement hook
      // credits each player's own wallet) and reset to a fresh waiting state.
      const next = seats.map((s) =>
        isCommitted(s)
          ? { ...s, payout_flag: "REFUND", payout_amount: Number(s.bet_chips) || 0 }
          : { ...s, bet_chips: 0, auto_replay: false, status: s.user_id ? "betting" : "empty" }
      );
      await patch({
        seats: next,
        common_wager: 0,
        betting_ends_at: 0,
        deal_at: 0,
        last_action_timestamp: now,
      });
      return;
    }
    await dealRound({ seats, bettors: finalBettors, patch, now });
    return;
  }

  if (status === "player_turns") {
    const cur = seats.find((s) => Number(s.seat_id) === Number(table.current_turn_seat));
    // Current seat already finished (stood/busted/empty/disconnected) → advance.
    if (!cur || cur.status !== "playing") {
      const nextTurn = nextDealtInSeat(seats, Number(table.current_turn_seat));
      if (nextTurn === null) {
        await patch({ status: "settling", last_action_timestamp: now });
        return;
      }
      await patch({
        current_turn_seat: nextTurn,
        reveal_deadline: now + TURN_MS,
        last_action_timestamp: now,
      });
      return;
    }
    // Per-turn deadline passed → auto-stand the active player and advance.
    const deadline = Number(table.reveal_deadline || 0);
    if (deadline && now >= deadline) {
      const next = seats.map((s) =>
        Number(s.seat_id) === Number(cur.seat_id) ? { ...s, status: "stood" } : s
      );
      const nextTurn = nextDealtInSeat(next, cur.seat_id);
      if (nextTurn === null) {
        await patch({ seats: next, status: "settling", last_action_timestamp: now });
        return;
      }
      await patch({
        seats: next,
        current_turn_seat: nextTurn,
        reveal_deadline: now + TURN_MS,
        last_action_timestamp: now,
      });
    }
    return;
  }

  if (status === "settling") {
    const { seats: settled, total_pot } = resolvePot(seats);
    await patch({
      seats: settled,
      total_pot,
      status: "completed",
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "completed") {
    const action = table.next_action;
    if (action) {
      const fields = applyNextAction(action, seats, table);
      if (fields) {
        await patch(fields);
        return;
      }
    }
    // Safety valve: if nobody chooses within COMPLETED_AUTO_MS, advance to a
    // fresh-bet round so the table never stays completed forever.
    if (now - Number(table.last_action_timestamp || 0) > COMPLETED_AUTO_MS) {
      const fields = applyNextAction("new_bet", seats, table);
      if (fields) await patch(fields);
    }
  }
}

// Two cards to every bettor, pick the first live seat as the starting turn,
// open the per-turn reveal window. No Dealer hand in PvP.
async function dealRound({ seats, bettors, patch, now }) {
  const deal = buildDeal(seats, bettors);
  await patch({
    seats: deal.seats,
    deck: deal.deck,
    total_pot: deal.total_pot,
    common_wager: deal.common_wager,
    current_turn_seat: deal.current_turn_seat,
    betting_ends_at: 0,
    deal_at: 0,
    status: "player_turns",
    reveal_deadline: Date.now() + TURN_MS,
    last_action_timestamp: Date.now(),
  });
}