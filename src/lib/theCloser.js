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

/** Seats allowed per Brunei calendar day — enforced by the closerSeat function. */
export const DAILY_LIMIT = 3;

function normaliseState(data = {}) {
  const remaining = Number(data.remaining);
  return {
    ok: data.ok !== false,
    blocked: data.blocked || null,
    date: data.date || "",
    chips: Number(data.chips) || 0,
    playCount: Number(data.playCount) || 0,
    remaining: Number.isFinite(remaining) ? remaining : DAILY_LIMIT,
    limit: Number(data.limit) || DAILY_LIMIT,
  };
}

/** Today's persisted plays for the signed-in player, dated server-side in Brunei time. */
export async function loadCloserState() {
  const res = await base44.functions.invoke("closerSeat", { action: "state" });
  return normaliseState(res?.data);
}

/** Deducts the seat fee and records one play; the server refuses a 4th play today. */
export async function takeSeat() {
  const playId =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const res = await base44.functions.invoke("closerSeat", { action: "seat", playId });
  return normaliseState(res?.data);
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