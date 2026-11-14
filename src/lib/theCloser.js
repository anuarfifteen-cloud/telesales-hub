import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";

/** The Closer — casual client-side game rules and wallet settlement. */

export const ENTRY_FEE = 100;
export const FOLDER_COUNT = 10;
export const PRIZES = [1, 10, 25, 50, 75, 100, 150, 250, 500, 1000];

/** The Manager calls exactly when this many desk folders are left. */
export const FOLDERS_AT_OFFER = 5;

/** The house keeps 15% of the true average for its buyout. */
export const HOUSE_EDGE = 0.15;

/**
 * Fisher–Yates shuffle of the prize list. The result stays in a local ref —
 * folder values are never written to the DOM or to markup before they open.
 */
export function shufflePrizes(prizes = PRIZES) {
  const values = [...prizes];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** True average of every value still in play, less the house edge, floored. */
export function managerOffer(remainingValues) {
  const values = (remainingValues || []).map((v) => Number(v) || 0);
  if (!values.length) return 0;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.floor((total / values.length) * (1 - HOUSE_EDGE));
}

/** Charges the 100-chip entry fee and returns the new chip balance. */
export async function chargeEntry(user) {
  const fresh = await base44.auth.me();
  const before = Number(fresh?.casinoChips) || 0;
  if (before < ENTRY_FEE) {
    throw new Error(`You need ${ENTRY_FEE} chips to take a seat.`);
  }
  const balanceAfter = before - ENTRY_FEE;
  await base44.auth.updateMe({ casinoChips: balanceAfter });
  logChipMovement({
    user,
    mode: "wallet",
    action_type: "bet",
    amount: -ENTRY_FEE,
    balance_after: balanceAfter,
    detail: `The Closer entry fee ${ENTRY_FEE}`,
  });
  return balanceAfter;
}

/** Credits a finished game's chips — the buyout offer or the lucky folder. */
export async function creditPrize({ user, amount, source }) {
  const payout = Number(amount) || 0;
  if (payout <= 0) return null;
  const fresh = await base44.auth.me();
  const before = Number(fresh?.casinoChips) || 0;
  const balanceAfter = before + payout;
  await base44.auth.updateMe({ casinoChips: balanceAfter });
  logChipMovement({
    user,
    mode: "wallet",
    action_type: "win",
    amount: payout,
    balance_after: balanceAfter,
    chips_won: payout,
    detail: `The Closer ${source} payout ${payout}`,
  });
  return balanceAfter;
}