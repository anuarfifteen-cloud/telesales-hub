// Pure helpers for the shared Multiplayer Blackjack PvP table.
// No database access, no side effects — every rule here is deterministic so
// every client derives the same outcome from the same table row.
import { handValue, isBlackjack } from "../blackjackDeck";

export const SEAT_COUNT = 5;
export const MIN_BET = 1;
export const MAX_BET = 50;
export const BETTING_MS = 10000; // 10-second betting window once the first wager lands
export const REVEAL_MS = 30000; // 30-second simultaneous-play window before auto-reveal
export const UNSTICK_MS = 30000; // stalled-table window before the reset button appears
export const ROUND_END_MS = 3500; // how long a finished round stays before auto-advance
export const COMPLETED_AUTO_MS = 15000; // auto-advance a completed round to new_bet if no choice made
export const AUTO_BET_GRACE_MS = 2000; // grace after betting closes for auto-bets to land
export const BET_IDLE_MS = 30000; // seated-but-unbet seats are kicked after this long in betting
export const MIN_PLAYERS_TO_DEAL = 2; // host + at least one matcher required to start a round
export const REPLAY_RESPONSE_MS = 10000; // how long non-host players have to accept/decline a Play Again
export const CARD_DEAL_STAGGER = 0.35; // seconds between the two initial deal-card sounds

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
    ready: false,
    auto_replay: false,
    last_activity: 0,
    payout_flag: "PENDING",
    payout_amount: 0,
    payout_claimed: false,
    replay_accept: null,
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

// The host is the player in the lowest occupied seat. Returns their user_id,
// or "" when nobody is seated. Drives host_user_id on the shared table row so
// every client agrees on who runs the engine and who may set the buy-in.
export function hostUserIdForSeats(seats) {
  const occupied = normalizeSeats(seats).filter((s) => s.user_id);
  if (!occupied.length) return "";
  occupied.sort((a, b) => a.seat_id - b.seat_id);
  return occupied[0].user_id;
}

export function seatByUser(seats, userId) {
  if (!userId) return null;
  return normalizeSeats(seats).find((s) => s.user_id === userId) || null;
}

// A bet is "committed" once its chips are actually paid into the pot. During a
// Replay round a seat's bet_chips is pre-filled but auto_replay stays true until
// the player's own client re-deducts — only then is it committed.
export function isCommitted(seat) {
  return Number(seat.bet_chips) > 0 && seat.auto_replay !== true;
}

// Clears every hand and payout flag for a fresh round while keeping players
// seated. `replay` keeps the common wager pre-filled (auto-commits next round);
// otherwise the wager is cleared so players bet fresh.
export function cleanSeats(seats, { replay = false, wager = MIN_BET } = {}) {
  return normalizeSeats(seats).map((s) => {
    if (!s.user_id) return emptySeat(s.seat_id);
    return {
      ...s,
      bet_chips: replay ? wager : 0,
      cards: [],
      hand_value: 0,
      status: "betting",
      ready: false,
      auto_replay: replay,
      last_activity: 0,
      payout_flag: "PENDING",
      payout_amount: 0,
      payout_claimed: false,
    };
  });
}

// A dealt-in hand is "reveal-ready" when it has busted or the player pressed
// Ready. The pot is scored only once EVERY dealt-in player is reveal-ready.
export function isRevealReady(seat) {
  return seat.status === "busted" || seat.ready === true;
}

export function allRevealReady(seats) {
  const players = normalizeSeats(seats).filter(
    (s) => s.user_id && (s.cards || []).length > 0
  );
  if (players.length === 0) return false;
  return players.every(isRevealReady);
}

// Auto-ready every dealt-in hand at the reveal deadline: stand any hand still
// being played, then mark ready. Busted hands are left as-is.
export function autoReadyForReveal(seats) {
  return normalizeSeats(seats).map((s) => {
    if (!s.user_id || !(s.cards || []).length) return s;
    if (s.status === "busted") return s;
    return {
      ...s,
      status: s.status === "playing" ? "stood" : s.status,
      ready: true,
    };
  });
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

// Build the table patch for a completed-round next-action choice. Each choice
// resets the table to a fresh waiting_for_bets state with the players kept.
export function applyNextAction(action, seats, table) {
  const now = Date.now();
  const wager = Number(table?.common_wager) || MIN_BET;

  if (action === "stop") {
    return {
      seats: Array.from({ length: SEAT_COUNT }, (_, i) => emptySeat(i + 1)),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      replay_deadline: 0,
      common_wager: 0,
      total_pot: 0,
      next_action: null,
      round_id: newRoundId(),
      last_action_timestamp: now,
    };
  }

  if (action === "new_bet") {
    return {
      seats: normalizeSeats(seats).map((s) =>
        s.user_id
          ? {
              ...s,
              cards: [],
              hand_value: 0,
              bet_chips: 0,
              status: "betting",
              ready: false,
              auto_replay: false,
              replay_accept: null,
              last_activity: 0,
              payout_flag: "PENDING",
              payout_amount: 0,
              payout_claimed: false,
            }
          : emptySeat(s.seat_id)
      ),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      replay_deadline: 0,
      common_wager: 0,
      total_pot: 0,
      next_action: null,
      round_id: newRoundId(),
      last_action_timestamp: now,
    };
  }

  if (action === "replay") {
    const hostId = table?.host_user_id;
    return {
      seats: normalizeSeats(seats).map((s) => {
        if (!s.user_id) return emptySeat(s.seat_id);
        // Only the host and players who accepted the Play Again prompt get
        // auto-replayed with the same wager. Decliners and non-responders sit
        // this round out (staying seated but not dealt in).
        const accepted = s.user_id === hostId || s.replay_accept === true;
        return {
          ...s,
          cards: [],
          hand_value: 0,
          bet_chips: accepted ? wager : 0,
          status: "betting",
          ready: false,
          auto_replay: accepted,
          replay_accept: null,
          last_activity: now,
          payout_flag: "PENDING",
          payout_amount: 0,
          payout_claimed: false,
        };
      }),
      deck: [],
      status: "waiting_for_bets",
      current_turn_seat: 1,
      betting_ends_at: 0,
      deal_at: 0,
      reveal_deadline: 0,
      replay_deadline: 0,
      common_wager: wager,
      total_pot: 0,
      next_action: null,
      round_id: newRoundId(),
      last_action_timestamp: now,
    };
  }

  return null;
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
    reveal_deadline: 0,
    next_action: null,
    common_wager: 0,
    total_pot: 0,
    deck: [],
    min_bet: MIN_BET,
    max_bet: MAX_BET,
    seats: normalizeSeats([]),
  };
}