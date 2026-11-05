// "Beat My Hand" — asynchronous 1v1 Blackjack 21.
//
// The whole mode is client-side and honour-based: Player 1 posts a finished
// hand score, Player 2 plays locally, and the accepting device compares the two
// scores and writes the payouts. There is no trusted server verification, so
// this is only suitable for the closed, trusted group the app runs for.

export const WAGER_PRESETS = [5, 10, 25, 50, 100];

// A challenge sits on the board for exactly 90 seconds.
export const CHALLENGE_TTL_MS = 90 * 1000;

// A private rematch only waits this long for the previous opponent to accept.
// Nobody is charged while it waits, so a miss simply cancels it.
export const REMATCH_ACCEPT_MS = 5 * 1000;

// Once a wager is locked the challenger gets this long to finish their hand.
// When the clock runs out the hand is stood as-is and settled.
export const TURN_SECONDS = 15;

// Grace period between finishing a hand and the challenge being posted, so the
// player sees their final total land before the hand goes on the board.
export const AUTO_POST_SECONDS = 3;

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
  switch (challenge.outcome) {
    case "house":
      return "Both busted — house won";
    case "push":
      return "Push — stakes returned";
    case "expired":
      return "Expired — stake returned";
    case "cancelled":
      return "Rematch cancelled — no chips staked";
    case "creator_win":
      return isCreator ? "Your hand won the pot" : "Challenger's hand won";
    case "opponent_win":
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