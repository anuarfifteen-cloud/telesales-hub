// Pure helpers for the 5-Player 60-Second Blitz Tournament.
// No database access, no side effects — every rule here is deterministic so
// every client derives the same outcome from the same table row.
import { handValue, isBlackjack, isSoft } from "../blackjackDeck";

export const SEAT_COUNT = 5;
export const ENTRY_FEE = 50; // casinoChips deducted per player
export const BLITZ_START_CHIPS = 1000; // temporary Blitz Chips per player
export const BLITZ_WAGER = 100; // standard wager per hand (or all-in if < 100)
export const BLITZ_DURATION_MS = 60000; // 60-second tournament
export const SETTLING_GRACE_MS = 3000; // grace after timer for final scores
export const DEALER_DRAW_MS = 600; // delay between dealer card draws
export const UNSTICK_MS = 30000; // stalled-table window before reset appears
export const COMPLETED_AUTO_MS = 15000; // auto-advance a completed tournament
export const BET_IDLE_MS = 60000; // unpaid seats kicked after this long

export function newRoundId() {
  return `RND-${Math.floor(10000 + Math.random() * 89999)}`;
}

export function emptySeat(seatId) {
  return {
    seat_id: seatId,
    user_id: "",
    user_name: "",
    bet_chips: 0,
    cards: [],
    hand_value: 0,
    blitz_score: 0,
    status: "empty",
    ready: false,
    auto_replay: false,
    last_activity: 0,
    last_seen: 0,
    payout_flag: "PENDING",
    payout_amount: 0,
    payout_claimed: false,
    replay_accept: null,
  };
}

export function normalizeSeats(seats) {
  const list = Array.isArray(seats) ? seats : [];
  return Array.from({ length: SEAT_COUNT }, (_, i) => {
    const found = list.find((s) => Number(s?.seat_id) === i + 1);
    return found ? { ...emptySeat(i + 1), ...found } : emptySeat(i + 1);
  });
}

export function hostUserIdForSeats(seats) {
  const occupied = normalizeSeats(seats).filter((s) => s.user_id);
  if (!occupied.length) return "";
  occupied.sort((a, b) => a.seat_id - b.seat_id);
  return occupied[0].user_id;
}

// ── Local hand rules (each player plays their own dealer) ──────────

// Dealer stands on soft 17 — hits below 17 only.
export function blitzDealerShouldHit(hand) {
  return handValue(hand) < 17;
}

// Settle a local hand. `totalWager` is the full amount deducted for the hand
// (original wager + double-down extra if any). Returns the chip amount to
// add back to the player's temporary balance.
//   Win (1:1)        → Math.floor(totalWager * 2)
//   Natural BJ (3:2) → Math.floor(totalWager * 2.5)  (2-card 21 only)
//   Push             → totalWager
//   Loss             → 0
export function settleBlitzHand(playerHand, dealerHand, totalWager) {
  const pVal = handValue(playerHand);
  const dVal = handValue(dealerHand);
  const pBust = pVal > 21;
  const dBust = dVal > 21;
  const pNatural = isBlackjack(playerHand); // 2-card 21 only
  const dNatural = isBlackjack(dealerHand);

  if (pBust) return { result: "loss", return: 0, detail: "Bust" };
  if (pNatural && dNatural) return { result: "push", return: totalWager, detail: "Push — both Blackjack" };
  if (pNatural) return { result: "blackjack", return: Math.floor(totalWager * 2.5), detail: "Blackjack! 3:2" };
  if (dNatural) return { result: "loss", return: 0, detail: "Dealer Blackjack" };
  if (dBust) return { result: "win", return: Math.floor(totalWager * 2), detail: "Dealer bust — You win" };
  if (pVal > dVal) return { result: "win", return: Math.floor(totalWager * 2), detail: "You win" };
  if (pVal === dVal) return { result: "push", return: totalWager, detail: "Push" };
  return { result: "loss", return: 0, detail: "Dealer wins" };
}

// ── Tournament resolution ──────────────────────────────────────────

// Determine the winner(s) from each seat's final blitz_score.
// Players with 0 chips are eliminated and cannot win.
// Winner-takes-all: the highest non-zero score gets the whole prize pool.
// Ties: split equally with Math.floor; any single-chip remainder goes to the
// lowest-seat tied winner (the house keeps any remainder if no eligible winners).
export function resolveBlitzWinners(seats, prizePool) {
  const list = normalizeSeats(seats);
  const pool = Number(prizePool) || 0;
  const eligible = list.filter((s) => s.user_id && Number(s.blitz_score) > 0);

  if (eligible.length === 0 || pool <= 0) {
    return {
      seats: list.map((s) =>
        s.user_id
          ? { ...s, payout_flag: "LOSS", payout_amount: 0 }
          : s
      ),
      prize_pool: pool,
    };
  }

  const maxScore = Math.max(...eligible.map((s) => Number(s.blitz_score)));
  const tied = eligible.filter((s) => Number(s.blitz_score) === maxScore);
  const share = Math.floor(pool / tied.length);
  const remainder = pool - share * tied.length;
  const tiedBySeat = [...tied].sort((a, b) => a.seat_id - b.seat_id);
  const sole = tied.length === 1;
  const winnerSeatIds = new Set(tied.map((s) => s.seat_id));

  return {
    seats: list.map((s) => {
      if (!s.user_id) return s;
      if (winnerSeatIds.has(s.seat_id)) {
        const idx = tiedBySeat.findIndex((w) => w.seat_id === s.seat_id);
        const amount = share + (idx === 0 ? remainder : 0);
        return {
          ...s,
          payout_flag: sole ? "WINNER" : "SPLIT",
          payout_amount: amount,
        };
      }
      return { ...s, payout_flag: "LOSS", payout_amount: 0 };
    }),
    prize_pool: pool,
  };
}

// ── Tournament start ───────────────────────────────────────────────

// Build the table patch that starts the 60-second tournament.
// Each paid seat gets 1000 Blitz Chips; the prize pool is the sum of entry fees.
export function startBlitzTournament(seats, now) {
  const paid = normalizeSeats(seats).filter(
    (s) => s.user_id && Number(s.bet_chips) >= ENTRY_FEE
  );
  const prizePool = paid.length * ENTRY_FEE;
  const updatedSeats = normalizeSeats(seats).map((s) => {
    if (s.user_id && Number(s.bet_chips) >= ENTRY_FEE) {
      return {
        ...s,
        blitz_score: BLITZ_START_CHIPS,
        status: "playing",
        cards: [],
        hand_value: 0,
        payout_flag: "PENDING",
        payout_amount: 0,
        payout_claimed: false,
      };
    }
    return s;
  });
  return {
    seats: updatedSeats,
    status: "player_turns",
    blitz_ends_at: now + BLITZ_DURATION_MS,
    prize_pool: prizePool,
    reveal_deadline: 0,
    betting_ends_at: 0,
    deal_at: 0,
    current_turn_seat: 1,
    deck: [],
    total_pot: 0,
    common_wager: 0,
    next_action: null,
    last_action_timestamp: now,
  };
}

// ── Completed-tournament next action ───────────────────────────────

export function blitzApplyNextAction(action, seats, table) {
  const now = Date.now();

  if (action === "stop") {
    return {
      seats: Array.from({ length: SEAT_COUNT }, (_, i) => emptySeat(i + 1)),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      common_wager: 0,
      total_pot: 0,
      next_action: null,
      blitz_ends_at: 0,
      prize_pool: 0,
      paid_winner_ids: [],
      round_id: newRoundId(),
      last_action_timestamp: now,
    };
  }

  if (action === "new_bet") {
    // Same players stay seated but must re-pay the entry fee.
    return {
      seats: normalizeSeats(seats).map((s) =>
        s.user_id
          ? {
              ...emptySeat(s.seat_id),
              user_id: s.user_id,
              user_name: s.user_name,
              status: "betting",
              last_activity: now,
              last_seen: now,
            }
          : emptySeat(s.seat_id)
      ),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      common_wager: 0,
      total_pot: 0,
      next_action: null,
      blitz_ends_at: 0,
      prize_pool: 0,
      paid_winner_ids: [],
      round_id: newRoundId(),
      last_action_timestamp: now,
    };
  }

  return null;
}

// ── Initial table record ───────────────────────────────────────────

export function initialBlitzTableRecord(hostUserId) {
  return {
    mode: "blitz",
    round_id: newRoundId(),
    status: "waiting_for_bets",
    current_turn_seat: 1,
    host_user_id: hostUserId || "",
    host_lease_expires_at: 0,
    last_action_timestamp: Date.now(),
    admin_reset_at: 0,
    blitz_ends_at: 0,
    prize_pool: 0,
    paid_winner_ids: [],
    betting_ends_at: 0,
    deal_at: 0,
    reveal_deadline: 0,
    replay_deadline: 0,
    next_action: null,
    common_wager: 0,
    total_pot: 0,
    deck: [],
    min_bet: 1,
    max_bet: 50,
    seats: normalizeSeats([]),
  };
}

// Reset an old PvP table to a fresh Blitz state (preserves the row id).
export function blitzResetFields(hostUserId, now) {
  return {
    mode: "blitz",
    status: "waiting_for_bets",
    round_id: newRoundId(),
    blitz_ends_at: 0,
    prize_pool: 0,
    paid_winner_ids: [],
    seats: normalizeSeats([]),
    deck: [],
    current_turn_seat: 1,
    betting_ends_at: 0,
    deal_at: 0,
    reveal_deadline: 0,
    common_wager: 0,
    total_pot: 0,
    next_action: null,
    host_user_id: hostUserId || "",
    host_lease_expires_at: 0,
    last_action_timestamp: now,
  };
}