// Pure helpers for the shared Multiplayer Blackjack table.
// No database access, no side effects — every rule here is deterministic so
// every client derives the same outcome from the same table row.
import { handValue, isBlackjack } from "../blackjackDeck";

export const SEAT_COUNT = 5;
export const MIN_BET = 1;
export const MAX_BET = 50;
export const BETTING_MS = 15000; // betting phase window once the first wager lands
export const TURN_MS = 15000; // per-seat turn window
export const UNSTICK_MS = 30000; // stalled-table window before the reset button appears
export const ROUND_END_MS = 8000; // how long a finished round stays on screen

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
    status: "empty",
    payout_flag: "PENDING",
    payout_claimed: false,
  };
}

// Always return exactly 5 seats in seat order, filling in any missing ones —
// so a partially written array can never break the table layout.
export function normalizeSeats(seats) {
  const list = Array.isArray(seats) ? seats : [];
  return Array.from({ length: SEAT_COUNT }, (_, i) => {
    const found = list.find((s) => Number(s?.seat_id) === i + 1);
    return found ? { ...emptySeat(i + 1), ...found } : emptySeat(i + 1);
  });
}

export function seatByUser(seats, userId) {
  if (!userId) return null;
  return normalizeSeats(seats).find((s) => s.user_id === userId) || null;
}

// Next seat still able to act, strictly after `fromSeat`. 0 = nobody left
// (the round moves to the Dealer).
export function nextPlayingSeat(seats, fromSeat) {
  const next = normalizeSeats(seats).find(
    (s) => s.seat_id > fromSeat && s.status === "playing"
  );
  return next ? next.seat_id : 0;
}

// Clears every hand, wager and payout flag for a fresh round while keeping
// players seated.
export function cleanSeats(seats) {
  return normalizeSeats(seats).map((s) => ({
    ...s,
    bet_chips: 0,
    cards: [],
    hand_value: 0,
    status: s.user_id ? "betting" : "empty",
    payout_flag: "PENDING",
    payout_claimed: false,
  }));
}

// Dealer hits on soft 16 or lower and stands on all 17s (including soft 17).
export function dealerShouldHit(hand) {
  return handValue(hand) < 17;
}

// Standard Blackjack resolution for one hand against the finished Dealer hand.
export function evaluateSeat(cards, dealerHand) {
  const player = handValue(cards);
  const dealer = handValue(dealerHand);
  if (player > 21) return "LOSS";

  const playerBJ = isBlackjack(cards);
  const dealerBJ = isBlackjack(dealerHand);
  if (playerBJ && dealerBJ) return "PUSH";
  if (playerBJ) return "BLACKJACK";
  if (dealerBJ) return "LOSS";
  if (dealer > 21) return "WIN";
  if (player > dealer) return "WIN";
  if (player < dealer) return "LOSS";
  return "PUSH";
}

// Chips returned to the player for a settled seat. The wager was already
// deducted when it was placed, so a win returns stake + profit.
export function payoutFor(flag, bet) {
  const wager = Number(bet) || 0;
  if (flag === "BLACKJACK") return Math.round(wager * 2.5); // 3:2 profit + stake
  if (flag === "WIN") return wager * 2; // 1:1 profit + stake
  if (flag === "PUSH") return wager; // stake returned
  return 0; // LOSS / bust — forfeited
}

export function payoutText(flag, bet) {
  const chips = payoutFor(flag, bet);
  if (flag === "BLACKJACK") return `BLACKJACK · +${chips}`;
  if (flag === "WIN") return `WIN · +${chips}`;
  if (flag === "PUSH") return `PUSH · ${chips} returned`;
  if (flag === "LOSS") return "LOSS · bet forfeited";
  return "";
}

export function initialTableRecord(hostUserId) {
  return {
    round_id: newRoundId(),
    status: "waiting_for_bets",
    current_turn_seat: 1,
    host_user_id: hostUserId || "",
    last_action_timestamp: Date.now(),
    betting_ends_at: 0,
    dealer_hand: [],
    deck: [],
    min_bet: MIN_BET,
    max_bet: MAX_BET,
    seats: normalizeSeats([]),
  };
}