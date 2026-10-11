// Pure helpers for the shared Multiplayer Blackjack PvP table.
// No database access, no side effects — every rule here is deterministic so
// every client derives the same outcome from the same table row.
import { handValue, isBlackjack } from "../blackjackDeck";

export const SEAT_COUNT = 5;
export const MIN_BET = 1;
export const MAX_BET = 50;
export const BETTING_MS = 10000; // 10-second betting window once the first wager lands
export const TURN_MS = 10000; // 10-second per-seat turn window
export const UNSTICK_MS = 30000; // stalled-table window before the reset button appears
export const ROUND_END_MS = 3500; // how long a finished round stays on screen before the next round
export const AUTO_BET_GRACE_MS = 2000; // grace after betting closes for auto-bets to land
export const BET_IDLE_MS = 30000; // seated-but-unbet seats are kicked after this long in betting

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
    payout_amount: 0,
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
// (the round moves to settlement).
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
    payout_amount: 0,
    payout_claimed: false,
  }));
}

// PvP winner-take-all resolution.
// Ranks every participating (dealt-in) hand:
//   • busted hands (>21) lose and forfeit their wager to the pot
//   • among non-busted hands, a natural two-card 21 outranks a 21 made with 3+ cards
//   • equal naturals tie; otherwise the highest hand value wins
//   • the sole highest hand wins the whole pot; tied highest hands split it
//     evenly with any indivisible remainder going to the lowest-seat tied winner
//   • if every participant busts, each wager is refunded
// Returns { seats, total_pot } with payout_flag + payout_amount set per seat.
export function resolvePot(seats) {
  const list = normalizeSeats(seats);
  const players = list.filter((s) => s.user_id && (s.cards || []).length > 0);
  const totalPot = players.reduce((sum, s) => sum + (Number(s.bet_chips) || 0), 0);

  const nonBusted = players.filter((s) => handValue(s.cards) <= 21);

  // All bust → refund every original wager.
  if (nonBusted.length === 0) {
    return {
      seats: list.map((s) => {
        if (!s.user_id || !(s.cards || []).length) return s;
        return {
          ...s,
          payout_flag: "REFUND",
          payout_amount: Number(s.bet_chips) || 0,
          hand_value: handValue(s.cards),
        };
      }),
      total_pot: totalPot,
    };
  }

  // Rank: natural blackjack (2-card 21) beats a non-natural 21, then by value.
  const rankOf = (s) => ({ v: handValue(s.cards), natural: isBlackjack(s.cards) });
  const cmp = (a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra.natural !== rb.natural) return ra.natural ? 1 : -1;
    return ra.v - rb.v;
  };

  let best = nonBusted[0];
  for (const p of nonBusted.slice(1)) if (cmp(p, best) > 0) best = p;
  const winners = nonBusted.filter((s) => cmp(s, best) === 0);

  const share = Math.floor(totalPot / winners.length);
  const remainder = totalPot - share * winners.length;
  const winnersBySeat = [...winners].sort((a, b) => a.seat_id - b.seat_id);
  const winnerIds = new Set(winners.map((s) => s.seat_id));
  const sole = winners.length === 1;

  return {
    seats: list.map((s) => {
      if (!s.user_id || !(s.cards || []).length) return s;
      const hv = handValue(s.cards);
      if (winnerIds.has(s.seat_id)) {
        const idx = winnersBySeat.findIndex((w) => w.seat_id === s.seat_id);
        const amount = share + (idx === 0 ? remainder : 0);
        return {
          ...s,
          payout_flag: sole ? "WINNER" : "SPLIT",
          payout_amount: amount,
          hand_value: hv,
        };
      }
      return {
        ...s,
        payout_flag: "LOSS",
        payout_amount: 0,
        hand_value: hv,
      };
    }),
    total_pot: totalPot,
  };
}

// Display helper: the chip amount a settled seat receives (read from the
// precomputed payout_amount so splits/remainders stay exact).
export function payoutFor(flag, bet, amount) {
  if (flag === "REFUND") return Number(bet) || 0;
  if (flag === "WINNER" || flag === "SPLIT") return Number(amount) || 0;
  return 0; // LOSS / PENDING
}

export function payoutText(flag, bet, amount) {
  const chips = payoutFor(flag, bet, amount);
  if (flag === "WINNER") return `WINNER · +${chips}`;
  if (flag === "SPLIT") return `SPLIT · +${chips}`;
  if (flag === "REFUND") return `REFUND · ${chips} returned`;
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
    deal_at: 0,
    common_wager: 0,
    total_pot: 0,
    deck: [],
    min_bet: MIN_BET,
    max_bet: MAX_BET,
    seats: normalizeSeats([]),
  };
}