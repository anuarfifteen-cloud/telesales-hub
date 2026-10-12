import { useEffect, useRef } from "react";
import {
  ENTRY_FEE,
  SEAT_COUNT,
  BET_IDLE_MS,
  normalizeSeats,
  emptySeat,
  hostUserIdForSeats,
  startBlitzTournament,
  resolveBlitzWinners,
  blitzApplyNextAction,
  blitzResetFields,
  newRoundId,
} from "./blitzEngine";
import { fetchPendingActions, deleteAction } from "../mp/tableActions";
import {
  shouldRunEngine,
  needsLeaseWrite,
  LEASE_MS,
  PRESENCE_TIMEOUT_MS,
} from "../mp/hostLease";
import { COMPLETED_AUTO_MS } from "./blitzEngine";

// The Blitz host engine. Runs on whichever client holds the host lease, once
// a second, only while the tab is visible. The lease holder is the sole writer
// of the ActiveTable row for tournament state transitions. Players INSERT
// TableAction records (JOIN, LEAVE, ACCEPT_BET, DECLINE_BET, BLITZ_SCORE,
// CLAIM, HEARTBEAT) and the host applies each one.
export default function useBlitzHostEngine({ table, patch, user }) {
  const ref = useRef({});
  ref.current = { table, patch, user };
  const busyRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(async () => {
      const current = ref.current;
      if (!current.table || !current.user) return;
      if (document.visibilityState !== "visible") return;
      if (!shouldRunEngine(current.table, current.user, Date.now())) return;
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        await runTick(current);
      } catch (e) {
        console.warn("Blitz host tick failed:", e);
      } finally {
        busyRef.current = false;
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
}

async function runTick({ table, patch, user }) {
  const now = Date.now();
  let latest = table;

  // Migrate old PvP tables to Blitz mode.
  if (latest.mode !== "blitz") {
    await patch(blitzResetFields(user.id, now));
    return;
  }

  // Claim or renew the host lease.
  if (needsLeaseWrite(latest, user.id, now)) {
    const claimed = await patch({
      host_user_id: user.id,
      host_lease_expires_at: now + LEASE_MS,
    });
    if (claimed) latest = claimed;
  }

  // 1. Process the action queue.
  const actions = await fetchPendingActions(latest.id);
  for (const action of actions) {
    if (action.action_type !== "HEARTBEAT" && action.round_id !== latest.round_id) {
      await deleteAction(action.id);
      continue;
    }
    const result = await applyAction(action, latest, patch, now);
    if (result) latest = result;
    await deleteAction(action.id);
  }

  // 2. Run the phase logic.
  await runPhase(latest, patch, now);
}

async function applyAction(action, table, patch, now) {
  const seats = normalizeSeats(table.seats);
  const status = table.status || "waiting_for_bets";
  const seat = seats.find((s) => Number(s.seat_id) === Number(action.seat_id));
  if (!seat) return null;
  if (action.action_type !== "JOIN" && seat.user_id !== action.user_id) return null;

  const resolveHost = (next) => {
    if (table.host_user_id && next.some((s) => s.user_id === table.host_user_id)) {
      return table.host_user_id;
    }
    return hostUserIdForSeats(next) || "";
  };

  if (action.action_type === "HEARTBEAT") {
    if (!seat.user_id || seat.user_id !== action.user_id) return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id) ? { ...s, last_seen: now } : s
    );
    return await patch({ seats: next });
  }

  if (action.action_type === "JOIN") {
    if (status !== "waiting_for_bets") return null;
    if (seat.user_id) return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? {
            ...s,
            user_id: action.user_id,
            user_name: action.user_name || "Player",
            bet_chips: 0,
            blitz_score: 0,
            status: "betting",
            last_activity: now,
            last_seen: now,
            payout_flag: "PENDING",
            payout_amount: 0,
            payout_claimed: false,
          }
        : s
    );
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "LEAVE") {
    // Targeted rollback: only clear the seat if it still belongs to this user.
    if (seat.user_id !== action.user_id) return null;
    if (status === "player_turns" || status === "settling") {
      const next = seats.map((s) =>
        Number(s.seat_id) === Number(action.seat_id)
          ? { ...s, status: "disconnected" }
          : s
      );
      return await patch({
        seats: next,
        host_user_id: resolveHost(next),
        last_action_timestamp: now,
      });
    }
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id) ? emptySeat(s.seat_id) : s
    );
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "ACCEPT_BET") {
    if (status !== "waiting_for_bets") return null;
    if (Number(seat.bet_chips) >= ENTRY_FEE) return null; // already paid
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? {
            ...s,
            bet_chips: ENTRY_FEE,
            status: "betting",
            last_activity: now,
            last_seen: now,
          }
        : s
    );
    return await patch({ seats: next, last_action_timestamp: now });
  }

  if (action.action_type === "DECLINE_BET") {
    if (status !== "waiting_for_bets") return null;
    if (!seat.user_id) return null;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id) ? emptySeat(s.seat_id) : s
    );
    return await patch({
      seats: next,
      host_user_id: resolveHost(next),
      last_action_timestamp: now,
    });
  }

  if (action.action_type === "BLITZ_SCORE") {
    if (status !== "player_turns" && status !== "settling") return null;
    const score = Number(action.wager) || 0;
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? { ...s, blitz_score: score, last_seen: now }
        : s
    );
    return await patch({ seats: next });
  }

  if (action.action_type === "CLAIM") {
    if (status !== "completed") return null;
    if (seat.payout_claimed) return null;
    const paidIds = Array.isArray(table.paid_winner_ids) ? table.paid_winner_ids : [];
    if (seat.payout_flag === "WINNER" || seat.payout_flag === "SPLIT") {
      if (!paidIds.includes(action.user_id)) {
        paidIds.push(action.user_id);
      }
    }
    const next = seats.map((s) =>
      Number(s.seat_id) === Number(action.seat_id)
        ? { ...s, payout_claimed: true }
        : s
    );
    return await patch({
      seats: next,
      paid_winner_ids: paidIds,
      last_action_timestamp: now,
    });
  }

  return null;
}

async function runPhase(table, patch, now) {
  const seats = normalizeSeats(table.seats);
  const seated = seats.filter((s) => s.user_id);
  const status = table.status || "waiting_for_bets";

  // Nobody seated — park the table clean.
  if (seated.length === 0) {
    const dirty =
      status !== "waiting_for_bets" ||
      Number(table.blitz_ends_at) > 0 ||
      Number(table.prize_pool) > 0 ||
      (Array.isArray(table.paid_winner_ids) && table.paid_winner_ids.length > 0) ||
      Number(table.host_lease_expires_at || 0) > 0;
    if (!dirty) return;
    await patch({
      ...blitzResetFields(table.host_user_id, now),
    });
    return;
  }

  if (status === "waiting_for_bets") {
    // Presence kick: free seats whose browsers have been gone.
    const stalePresence = seated.filter(
      (s) =>
        s.status !== "disconnected" &&
        Number(s.last_seen) > 0 &&
        now - Number(s.last_seen) > PRESENCE_TIMEOUT_MS
    );
    // Idle kick: unpaid seats idle beyond BET_IDLE_MS.
    const staleUnpaid = seated.filter(
      (s) =>
        s.status !== "disconnected" &&
        Number(s.bet_chips) < ENTRY_FEE &&
        Number(s.last_activity) > 0 &&
        now - Number(s.last_activity) > BET_IDLE_MS
    );
    const toKick = [...new Set([...stalePresence, ...staleUnpaid].map((s) => s.seat_id))];
    if (toKick.length) {
      const kicked = new Set(toKick);
      const next = seats.map((s) =>
        kicked.has(s.seat_id) ? emptySeat(s.seat_id) : s
      );
      await patch({
        seats: next,
        host_user_id:
          table.host_user_id && next.some((s) => s.user_id === table.host_user_id)
            ? table.host_user_id
            : hostUserIdForSeats(next) || "",
        last_action_timestamp: now,
      });
      return;
    }

    // Auto-start: 5 paid seats → start immediately.
    const paidSeats = seated.filter((s) => Number(s.bet_chips) >= ENTRY_FEE);
    if (paidSeats.length >= SEAT_COUNT) {
      const fields = startBlitzTournament(seats, now);
      await patch(fields);
      return;
    }
    return;
  }

  if (status === "player_turns") {
    const blitzEnds = Number(table.blitz_ends_at) || 0;
    if (blitzEnds && now >= blitzEnds) {
      await patch({
        status: "settling",
        reveal_deadline: now + 3000, // SETTLING_GRACE_MS
        last_action_timestamp: now,
      });
      return;
    }
    return;
  }

  if (status === "settling") {
    const deadline = Number(table.reveal_deadline) || 0;
    if (deadline && now < deadline) return; // wait for final scores

    const { seats: settled, prize_pool } = resolveBlitzWinners(
      seats,
      table.prize_pool
    );
    await patch({
      seats: settled,
      prize_pool,
      status: "completed",
      reveal_deadline: 0,
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "completed") {
    const action = table.next_action;
    if (action) {
      const fields = blitzApplyNextAction(action, seats, table);
      if (fields) {
        await patch(fields);
        return;
      }
    }
    if (now - Number(table.last_action_timestamp || 0) > COMPLETED_AUTO_MS) {
      const fields = blitzApplyNextAction("new_bet", seats, table);
      if (fields) await patch(fields);
    }
  }
}