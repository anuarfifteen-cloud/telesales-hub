import { useEffect, useRef } from "react";
import { createDeck, shuffle, handValue } from "../blackjackDeck";
import {
  MIN_BET,
  TURN_MS,
  ROUND_END_MS,
  AUTO_BET_GRACE_MS,
  normalizeSeats,
  nextPlayingSeat,
  resolvePot,
  cleanSeats,
  newRoundId,
} from "./mpEngine";

// The table engine. Runs only on the host's client, once a second, and only
// while the tab is visible — it closes betting, deals, auto-stands timed-out
// seats, evaluates the pot and writes the payout flags.
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
      table.common_wager ||
      table.total_pot;
    if (!dirty) return;
    await patch({
      seats: cleanSeats(seats),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      common_wager: 0,
      total_pot: 0,
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "waiting_for_bets") {
    const seatedLive = seated.filter((s) => s.status !== "disconnected");
    const bettors = seatedLive
      .filter((s) => Number(s.bet_chips) >= MIN_BET)
      .sort((a, b) => a.seat_id - b.seat_id);

    // Instant-start: as soon as every seated player has bet, deal right away.
    if (bettors.length > 0 && bettors.length === seatedLive.length) {
      await dealRound({ seats, bettors, patch });
      return;
    }

    // No wager yet → no timer to run.
    if (!table.betting_ends_at || now < table.betting_ends_at) return;

    // Betting window closed with unbet seats — give auto-bets a brief grace,
    // then deal to whoever has wagered.
    if (!table.deal_at) {
      await patch({ deal_at: now + AUTO_BET_GRACE_MS });
      return;
    }
    if (now < table.deal_at) return;

    const finalBettors = seatedLive
      .filter((s) => Number(s.bet_chips) >= MIN_BET)
      .sort((a, b) => a.seat_id - b.seat_id);
    if (finalBettors.length === 0) {
      await patch({ betting_ends_at: 0, deal_at: 0, common_wager: 0 });
      return;
    }
    await dealRound({ seats, bettors: finalBettors, patch });
    return;
  }

  if (status === "player_turns") {
    const active = seats.find((s) => s.seat_id === table.current_turn_seat);
    if (!active || active.status !== "playing") {
      const next = nextPlayingSeat(seats, table.current_turn_seat || 0);
      await patch({
        current_turn_seat: next || 1,
        status: next ? "player_turns" : "settling",
        last_action_timestamp: now,
      });
      return;
    }
    // Seat ran out of time (or dropped) — stand it automatically.
    if (now - Number(table.last_action_timestamp || 0) > TURN_MS) {
      const nextSeats = seats.map((s) =>
        s.seat_id === active.seat_id ? { ...s, status: "stood" } : s
      );
      const next = nextPlayingSeat(nextSeats, active.seat_id);
      await patch({
        seats: nextSeats,
        current_turn_seat: next || 1,
        status: next ? "player_turns" : "settling",
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
    if (now - Number(table.last_action_timestamp || 0) > ROUND_END_MS) {
      await patch({
        seats: cleanSeats(seats),
        deck: [],
        status: "waiting_for_bets",
        current_turn_seat: 1,
        betting_ends_at: 0,
        deal_at: 0,
        common_wager: 0,
        total_pot: 0,
        round_id: newRoundId(),
        last_action_timestamp: now,
      });
    }
  }
}

// Two cards to every participant. No Dealer hand in PvP. Sums the wagers into
// the pot and opens the turn at the lowest-numbered bettor.
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
        payout_flag: "PENDING",
        payout_amount: 0,
        payout_claimed: false,
      };
    }
    // A seated player who didn't wager (or couldn't match) sits this round out.
    return {
      ...s,
      cards: [],
      hand_value: 0,
      status: s.user_id ? "betting" : "empty",
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
    last_action_timestamp: Date.now(),
  });
}