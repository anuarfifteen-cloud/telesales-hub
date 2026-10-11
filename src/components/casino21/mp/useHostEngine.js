import { useEffect, useRef } from "react";
import { createDeck, shuffle, handValue } from "../blackjackDeck";
import {
  MIN_BET,
  REVEAL_MS,
  ROUND_END_MS,
  COMPLETED_AUTO_MS,
  AUTO_BET_GRACE_MS,
  BET_IDLE_MS,
  MIN_PLAYERS_TO_DEAL,
  normalizeSeats,
  isCommitted,
  allRevealReady,
  autoReadyForReveal,
  applyNextAction,
  resolvePot,
  cleanSeats,
  emptySeat,
  newRoundId,
} from "./mpEngine";

// The table engine. Runs only on the host's client, once a second, and only
// while the tab is visible — it closes betting, deals, auto-readies hands at
// the reveal deadline, evaluates the pot, and applies the next-round choice.
//
// This is deliberately client-driven (no backend functions on this plan), so it
// is best-effort: if the host closes their tab mid-round the engine stops and
// any player can use the emergency reset to unstick the table.
export default function useHostEngine({ table, patch, user }) {
  const ref = useRef({});
  ref.current = { table, patch, user };
  const busyRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(async () => {
      const current = ref.current;
      if (!current.table || !current.user) return;
      if (current.table.host_user_id !== current.user.id) return;
      if (document.visibilityState !== "visible") return;
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        await runTick(current);
      } catch (e) {
        console.warn("Multiplayer host tick failed:", e);
      } finally {
        busyRef.current = false;
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
}

async function runTick({ table, patch }) {
  const now = Date.now();
  const seats = normalizeSeats(table.seats);
  const seated = seats.filter((s) => s.user_id);
  const status = table.status || "waiting_for_bets";

  // Nobody is seated — park the table in a clean waiting state so the next
  // player never inherits a stale hand.
  if (seated.length === 0) {
    const dirty =
      status !== "waiting_for_bets" ||
      (table.deck || []).length > 0 ||
      table.betting_ends_at ||
      table.deal_at ||
      table.reveal_deadline ||
      table.common_wager ||
      table.total_pot ||
      table.next_action;
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
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "waiting_for_bets") {
    // Drop seats that sat down but never committed a bet within 30s — frees the
    // seat for someone else. Only uncommitted seats are kicked.
    const stale = seated.filter(
      (s) =>
        s.status !== "disconnected" &&
        !isCommitted(s) &&
        Number(s.last_activity) > 0 &&
        now - Number(s.last_activity) > BET_IDLE_MS
    );
    if (stale.length) {
      const kicked = new Set(stale.map((s) => s.seat_id));
      const next = seats.map((s) =>
        kicked.has(s.seat_id) ? emptySeat(s.seat_id) : s
      );
      const remainingBettors = next.filter((s) => Number(s.bet_chips) > 0);
      await patch({
        seats: next,
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

    // Instant-start: as soon as every seated player has committed AND there are
    // enough players (host + at least one matcher), deal.
    if (
      bettors.length >= MIN_PLAYERS_TO_DEAL &&
      bettors.length === seatedLive.length
    ) {
      await dealRound({ seats, bettors, patch });
      return;
    }

    // No wager on the table yet → no timer to run.
    const anyWager = seatedLive.some((s) => Number(s.bet_chips) > 0);
    if (!anyWager) return;
    if (!table.betting_ends_at || now < table.betting_ends_at) return;

    // Betting window closed with uncommitted seats — give auto-bets a grace,
    // then deal to whoever has committed.
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
    await dealRound({ seats, bettors: finalBettors, patch });
    return;
  }

  if (status === "player_turns") {
    // Everyone reveal-ready → score the pot now.
    if (allRevealReady(seats)) {
      await patch({ status: "settling", last_action_timestamp: now });
      return;
    }
    // Reveal deadline passed → auto-ready the remaining hands, then score.
    const deadline = Number(table.reveal_deadline || 0);
    if (deadline && now >= deadline) {
      await patch({
        seats: autoReadyForReveal(seats),
        status: "settling",
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
    // A player has chosen Replay / New Bet / Stop — apply it.
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

// Two cards to every participant. No Dealer hand in PvP. Sums the wagers into
// the pot and opens the 30-second simultaneous-play reveal window.
async function dealRound({ seats, bettors, patch }) {
  const deck = shuffle(createDeck());
  const draw = () => deck.pop();
  const ids = new Set(bettors.map((b) => b.seat_id));
  const totalPot = bettors.reduce((sum, b) => sum + (Number(b.bet_chips) || 0), 0);
  const commonWager = Number(bettors[0].bet_chips) || MIN_BET;

  const next = seats.map((s) => {
    if (ids.has(s.seat_id)) {
      const cards = [draw(), draw()];
      return {
        ...s,
        cards,
        hand_value: handValue(cards),
        status: "playing",
        ready: false,
        auto_replay: false,
        payout_flag: "PENDING",
        payout_amount: 0,
        payout_claimed: false,
      };
    }
    // A seated player who didn't commit sits this round out.
    return {
      ...s,
      cards: [],
      hand_value: 0,
      status: s.user_id ? "betting" : "empty",
      ready: false,
      auto_replay: false,
      payout_flag: "PENDING",
      payout_amount: 0,
      payout_claimed: false,
    };
  });

  await patch({
    seats: next,
    deck,
    total_pot: totalPot,
    common_wager: commonWager,
    betting_ends_at: 0,
    deal_at: 0,
    status: "player_turns",
    current_turn_seat: bettors[0].seat_id,
    reveal_deadline: Date.now() + REVEAL_MS,
    last_action_timestamp: Date.now(),
  });
}