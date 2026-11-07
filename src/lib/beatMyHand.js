// "Beat My Hand" — asynchronous 1v1 Blackjack 21.
//
// The whole mode is client-side and honour-based: Player 1 posts a finished
// hand score, Player 2 plays locally, and the accepting device compares the two
// scores and writes the payouts. There is no trusted server verification, so
// this is only suitable for the closed, trusted group the app runs for.

// Chip stakes, including the high-roller tiers. Anything above the player's
// balance is shown disabled rather than removed, so the ladder never shifts.
export const WAGER_PRESETS = [5, 10, 25, 50, 100, 250, 500, 1000];

// The Diamond tier: one Diamond is staked by each side and never converted to
// chips — it is paid out, refunded and collected as Diamonds.
export const DIAMOND_WAGER = 1;

/** A challenge's stake currency. Records from before the Diamond tier have no
 *  stake_type and are always chip challenges. */
export function stakeTypeOf(challenge) {
  return challenge?.stake_type === "diamond" ? "diamond" : "chips";
}

/** The user field a stake of this currency is deducted from. */
export function walletFieldFor(stakeType) {
  return stakeType === "diamond" ? "diamonds" : "casinoChips";
}

/** Human label for a stake, e.g. "250 chips" or "1 💎 Diamond". */
export function stakeLabel(amount, stakeType) {
  const n = Number(amount) || 0;
  if (stakeType === "diamond") return `${n} 💎 Diamond${n === 1 ? "" : "s"}`;
  return `${n} chip${n === 1 ? "" : "s"}`;
}

/** True when the wallet can cover this exact stake in its own currency. */
export function canAffordStake(user, stakeType, amount) {
  const n = Number(amount) || 0;
  const wallet = Number(user?.[walletFieldFor(stakeType)]) || 0;
  return wallet >= n;
}

// ── Best of 3 ───────────────────────────────────────────────────────────
// A match is the same three indexed hands per player. Records written before
// this existed carry no format and are always read as a standard match.
export const MATCH_HANDS = 3;

/** The match shape on a record. Absent means a standard single hand. */
export function formatOf(challenge) {
  return challenge?.format === "best_of_3" ? "best_of_3" : "standard";
}

/** One side's ordered hands, falling back to the single-hand fields so a
 *  standard or legacy record reads as a one-hand list. */
export function handsOf(challenge, side) {
  const hands = side === "creator" ? challenge?.creator_hands : challenge?.opponent_hands;
  if (Array.isArray(hands) && hands.length) return hands;
  const score = side === "creator" ? challenge?.creator_score : challenge?.opponent_score;
  const cards = side === "creator" ? challenge?.creator_cards : challenge?.opponent_cards;
  return [{ score: Number(score) || 0, cards: Array.isArray(cards) ? cards : [] }];
}

/**
 * Who takes one indexed hand.
 *
 * Both bust           → tie, nobody scores
 * Player 2 busts      → Player 1 wins the hand
 * Player 1 busts      → Player 2 wins the hand
 * Higher valid total  → that player wins the hand
 * Same valid total    → tie
 */
export function handWinner(creatorScore, opponentScore) {
  const c = Number(creatorScore) || 0;
  const o = Number(opponentScore) || 0;
  const creatorBust = c > 21;
  const opponentBust = o > 21;
  if (creatorBust && opponentBust) return "tie";
  if (creatorBust) return "opponent";
  if (opponentBust) return "creator";
  if (c > o) return "creator";
  if (o > c) return "opponent";
  return "tie";
}

/**
 * Decide a Best of 3 match from both sides' three hands, compared by index.
 * The player with more hand wins takes the pot; equal hand wins (1-1-1,
 * 0-0-3, 2-2-2…) are a push and return both stakes.
 *
 * @returns {{outcome: string, creatorPayout: number, opponentPayout: number,
 *            creatorHandWins: number, opponentHandWins: number,
 *            results: string[], detail: string}}
 */
export function resolveMatch(creatorHands, opponentHands, wager) {
  const stake = Number(wager) || 0;
  const pot = stake * 2;
  const c = Array.isArray(creatorHands) ? creatorHands : [];
  const o = Array.isArray(opponentHands) ? opponentHands : [];
  const total = Math.max(c.length, o.length, MATCH_HANDS);
  const results = Array.from({ length: total }, (_, i) =>
    handWinner(c[i]?.score, o[i]?.score)
  );
  const creatorHandWins = results.filter((r) => r === "creator").length;
  const opponentHandWins = results.filter((r) => r === "opponent").length;
  const line = `${creatorHandWins}–${opponentHandWins} on hands`;

  if (creatorHandWins === opponentHandWins) {
    return {
      outcome: "push",
      creatorPayout: stake,
      opponentPayout: stake,
      creatorHandWins,
      opponentHandWins,
      results,
      detail: `${line} — a push, both stakes returned.`,
    };
  }
  if (creatorHandWins > opponentHandWins) {
    return {
      outcome: "creator_win",
      creatorPayout: pot,
      opponentPayout: 0,
      creatorHandWins,
      opponentHandWins,
      results,
      detail: `${line} — the poster takes the pot.`,
    };
  }
  return {
    outcome: "opponent_win",
    creatorPayout: 0,
    opponentPayout: pot,
    creatorHandWins,
    opponentHandWins,
    results,
    detail: `${line} — the challenger takes the pot.`,
  };
}

// A challenge sits on the board for exactly 90 seconds.
export const CHALLENGE_TTL_MS = 90 * 1000;

// ── Simultaneous blind play (standard format) ───────────────────────────
// Both players play their own hand at the same time and only write their own
// score fields, so nothing is saved while cards are drawn. The moment the first
// hand is submitted the other player has this long to finish; if they don't,
// the match is voided and both stakes are returned.
export const BLIND_WAIT_MS = 90 * 1000;

/** Has this side finished their hand yet? */
export function hasSubmitted(challenge, side) {
  const at =
    side === "creator" ? challenge?.creator_submitted_at : challenge?.opponent_submitted_at;
  return Number(at) > 0;
}

// Once a wager is locked the challenger gets this long to finish their hand.
// When the clock runs out the hand is stood as-is and settled.
export const TURN_SECONDS = 15;

/**
 * Compare the two finished hands and decide the pot.
 *
 * Both bust            → house keeps the pot
 * Player 2 busts       → Player 1 wins
 * Player 1 busts       → Player 2 wins
 * Player 2 higher      → Player 2 wins
 * Same valid total     → push, both stakes returned
 * Otherwise            → Player 1 wins
 *
 * @returns {{outcome: string, creatorPayout: number, opponentPayout: number, detail: string}}
 */
export function resolveHands(creatorScore, opponentScore, wager) {
  const stake = Number(wager) || 0;
  const pot = stake * 2;
  const c = Number(creatorScore) || 0;
  const o = Number(opponentScore) || 0;
  const creatorBust = c > 21;
  const opponentBust = o > 21;

  if (creatorBust && opponentBust) {
    return {
      outcome: "house",
      creatorPayout: 0,
      opponentPayout: 0,
      detail: `Both busted (${c} and ${o}) — the house keeps the pot.`,
    };
  }
  if (opponentBust) {
    return {
      outcome: "creator_win",
      creatorPayout: pot,
      opponentPayout: 0,
      detail: `Player 2 busted at ${o} — the challenger's ${c} takes the pot.`,
    };
  }
  if (creatorBust) {
    return {
      outcome: "opponent_win",
      creatorPayout: 0,
      opponentPayout: pot,
      detail: `The challenger busted at ${c} — ${o} takes the pot.`,
    };
  }
  if (o > c) {
    return {
      outcome: "opponent_win",
      creatorPayout: 0,
      opponentPayout: pot,
      detail: `${o} beats ${c} — Player 2 takes the pot.`,
    };
  }
  if (o === c) {
    return {
      outcome: "push",
      creatorPayout: stake,
      opponentPayout: stake,
      detail: `Both stood on ${c} — a push, both stakes returned.`,
    };
  }
  return {
    outcome: "creator_win",
    creatorPayout: pot,
    opponentPayout: 0,
    detail: `The challenger's ${c} beats ${o} — the pot goes back to Player 1.`,
  };
}

// One-line outcome summary, always worded for the viewer.
export function outcomeLine(challenge, isCreator) {
  const isMatch = formatOf(challenge) === "best_of_3";
  switch (challenge.outcome) {
    case "house":
      return "Both busted — house won";
    case "push":
      return isMatch ? "Push — match tied, stakes returned" : "Push — stakes returned";
    case "expired":
      return "Expired — stake returned";
    case "void":
      return "Voided — both stakes returned";
    case "creator_win":
      if (isMatch) return isCreator ? "Your match won the pot" : "Challenger won the match";
      return isCreator ? "Your hand won the pot" : "Challenger's hand won";
    case "opponent_win":
      if (isMatch) return isCreator ? "You lost the match" : "You won the match";
      return isCreator ? "You were beaten" : "You beat the challenger";
    default:
      return "Settled";
  }
}

/** An open challenge whose 90-second window has run out. */
export function isExpired(challenge) {
  return (
    challenge?.status === "open" &&
    Number(challenge?.expires_at) > 0 &&
    Number(challenge.expires_at) <= Date.now()
  );
}

/** Whole seconds still on the clock (never negative). */
export function secondsLeft(expiresAt) {
  return Math.max(0, Math.ceil(((Number(expiresAt) || 0) - Date.now()) / 1000));
}