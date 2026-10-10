import { useEffect, useRef } from "react";
import { createDeck, shuffle, handValue } from "../blackjackDeck";
import {
  MIN_BET,
  TURN_MS,
  ROUND_END_MS,
  normalizeSeats,
  nextPlayingSeat,
  dealerShouldHit,
  evaluateSeat,
  cleanSeats,
  newRoundId,
} from "./mpEngine";

// The table engine. Runs only on the host's client, once a second, and only
// while the tab is visible — it closes betting, deals, auto-stands timed-out
// seats, plays the Dealer and writes the payout flags.
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
      (table.dealer_hand || []).length > 0 ||
      (table.deck || []).length > 0 ||
      table.betting_ends_at;
    if (!dirty) return;
    await patch({
      seats: cleanSeats(seats),
      dealer_hand: [],
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      last_action_timestamp: now,
    });
    return;
  }

  if (status === "waiting_for_bets") {
    // Betting opens with the first wager; no wager means nothing to deal.
    if (!table.betting_ends_at || now < table.betting_ends_at) return;
    const bettors = seats
      .filter(
        (s) =>
          s.user_id && Number(s.bet_chips) >= MIN_BET && s.status !== "disconnected"
      )
      .sort((a, b) => a.seat_id - b.seat_id);
    // Nobody wagered — reopen and wait for the next wager instead of looping.
    if (bettors.length === 0) {
      await patch({ betting_ends_at: 0 });
      return;
    }
    await dealRound({ seats, bettors, patch });
    return;
  }

  if (status === "player_turns") {
    const active = seats.find((s) => s.seat_id === table.current_turn_seat);
    if (!active || active.status !== "playing") {
      const next = nextPlayingSeat(seats, table.current_turn_seat || 0);
      await patch({
        current_turn_seat: next || 1,
        status: next ? "player_turns" : "dealer_turn",
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
        status: next ? "player_turns" : "dealer_turn",
        last_action_timestamp: now,
      });
    }
    return;
  }

  if (status === "dealer_turn") {
    await playDealer({ table, seats, patch });
    return;
  }

  if (status === "completed") {
    if (now - Number(table.last_action_timestamp || 0) > ROUND_END_MS) {
      await patch({
        seats: cleanSeats(seats),
        dealer_hand: [],
        deck: [],
        status: "waiting_for_bets",
        current_turn_seat: 1,
        betting_ends_at: 0,
        round_id: newRoundId(),
        last_action_timestamp: now,
      });
    }
  }
}

// Two cards to every active bettor and two to the Dealer (second one face down).
async function dealRound({ seats, bettors, patch }) {
  const deck = shuffle(createDeck());
  const draw = () => deck.pop();
  const ids = new Set(bettors.map((b) => b.seat_id));

  const next = seats.map((s) => {
    if (ids.has(s.seat_id)) {
      const cards = [draw(), draw()];
      return {
        ...s,
        cards,
        hand_value: handValue(cards),
        status: "playing",
        payout_flag: "PENDING",
        payout_claimed: false,
      };
    }
    // A player who dropped after betting gets their wager returned.
    if (s.user_id && Number(s.bet_chips) > 0) {
      return {
        ...s,
        cards: [],
        hand_value: 0,
        status: "betting",
        payout_flag: "PUSH",
        payout_claimed: false,
      };
    }
    return {
      ...s,
      cards: [],
      hand_value: 0,
      status: s.user_id ? "betting" : "empty",
      payout_flag: "PENDING",
      payout_claimed: false,
    };
  });

  const dealer = [draw(), { ...draw(), faceUp: false }];

  await patch({
    seats: next,
    dealer_hand: dealer,
    deck,
    status: "player_turns",
    current_turn_seat: bettors[0].seat_id,
    last_action_timestamp: Date.now(),
  });
}

// Reveals the hole card, plays the Dealer hand out, then flags every live hand.
async function playDealer({ table, seats, patch }) {
  const dealer = (table.dealer_hand || []).map((c) => ({ ...c, faceUp: true }));
  let deck = [...(table.deck || [])];

  // Reveal the hole card first so everyone watches the same hand.
  await patch({ dealer_hand: dealer.map((c) => ({ ...c })) });

  while (dealerShouldHit(dealer)) {
    deck = [...deck];
    dealer.push(deck.pop());
    await new Promise((r) => setTimeout(r, 700));
    await patch({ dealer_hand: dealer.map((c) => ({ ...c })), deck });
  }

  await new Promise((r) => setTimeout(r, 500));

  const next = seats.map((s) => {
    if (!s.user_id || !(s.cards || []).length || s.payout_flag !== "PENDING") return s;
    return {
      ...s,
      payout_flag: evaluateSeat(s.cards, dealer),
      hand_value: handValue(s.cards),
    };
  });

  await patch({
    seats: next,
    dealer_hand: dealer,
    deck,
    status: "completed",
    last_action_timestamp: Date.now(),
  });
}