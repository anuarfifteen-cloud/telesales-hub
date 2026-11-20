import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import { LIVE_WIN_METHOD, recordDealbreakerWin } from "@/lib/dealbreakerLiveFeed";

/** The Closer — casual client-side game rules and wallet settlement. */

export const ENTRY_FEE = 100;
export const FOLDER_COUNT = 10;
export const PRIZES = [1, 10, 25, 50, 75, 100, 150, 250, 500, 1000];

/** The Manager calls exactly when this many desk folders are left. */
export const FOLDERS_AT_OFFER = 5;

/** The house keeps 15% of the true average for its buyout. */
export const HOUSE_EDGE = 0.15;

/** How many Mystery Wildcard slots a round deals. */
export const MYSTERY_COUNT = 2;

/**
 * The secret Chip values a Wildcard can hold, with their relative weights —
 * a 1,000 roll is the rare second Grand Win.
 */
export const MYSTERY_TABLE = [
  { value: 5, weight: 20 },
  { value: 15, weight: 20 },
  { value: 40, weight: 20 },
  { value: 100, weight: 15 },
  { value: 175, weight: 15 },
  { value: 300, weight: 8 },
  { value: 1000, weight: 2 },
];

/** Fisher–Yates shuffle — returns a new array, never the one passed in. */
function shuffled(items) {
  const values = [...items];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** One weighted roll of a Wildcard's secret value. */
function rollMysteryValue() {
  const total = MYSTERY_TABLE.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;
  for (const row of MYSTERY_TABLE) {
    roll -= row.weight;
    if (roll < 0) return row.value;
  }
  return MYSTERY_TABLE[MYSTERY_TABLE.length - 1].value;
}

/**
 * Deals the round's ten folders. Every folder keeps the standard ladder prize it
 * stands for in `base`, while `value` is what it truly pays — for a Mystery
 * Wildcard, a freshly rolled secret amount. The objects stay in a local ref so a
 * Wildcard's value never reaches the markup before its folder opens.
 */
export function dealFolders(prizes = PRIZES) {
  const mysteryBases = shuffled(
    prizes.filter((value) => !LOCKED_VISIBLE_VALUES.includes(value))
  ).slice(0, MYSTERY_COUNT);

  return shuffled(
    prizes.map((base, i) => {
      const isMystery = mysteryBases.includes(base);
      return {
        id: `${i}-${base}`,
        base,
        value: isMystery ? rollMysteryValue() : base,
        isMystery,
        isDiamond: base === DIAMOND_VALUE,
      };
    })
  );
}

/** True average of every value still in play, less the house edge, floored. */
export function managerOffer(remainingValues) {
  const values = (remainingValues || []).map((v) => Number(v) || 0);
  if (!values.length) return 0;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.floor((total / values.length) * (1 - HOUSE_EDGE));
}

/**
 * The VIP Client's actual buyout: the house offer with a ±5% negotiation swing
 * on top. Rolled once when the call triggers and then kept in the round state,
 * so the amount shown is exactly the amount paid and a refresh cannot re-roll it.
 */
export function negotiatedOffer(baseOffer) {
  const base = Number(baseOffer) || 0;
  if (base <= 0) return 0;
  const swingMultiplier = 0.95 + Math.random() * 0.1;
  return Math.max(1, Math.round(base * swingMultiplier));
}

/** Seats allowed per Brunei calendar day — enforced by the closerSeat function. */
export const DAILY_LIMIT = 3;

/** The once-a-day token pack that adds these plays to the day. */
export const BONUS_PLAYS = 3;
export const BONUS_COST = 5;

/** The plays of the Brunei day that are Diamond Rounds (third and sixth seat). */
export const DIAMOND_SLOTS = [3, 6];

/** The one folder value that pays a Diamond instead of chips in a Diamond Round. */
export const DIAMOND_VALUE = 500;

/**
 * The two top slots are never masked — the Grand Win and the Diamond slot stay
 * visible on the ladder in every round, Wildcards or not.
 */
export const LOCKED_VISIBLE_VALUES = [DIAMOND_VALUE, 1000];

/** Diamonds paid by a Diamond Round win. */
export const DIAMOND_PRIZE = 1;

function normaliseState(data = {}) {
  const remaining = Number(data.remaining);
  return {
    ok: data.ok !== false,
    blocked: data.blocked || null,
    date: data.date || "",
    chips: Number(data.chips) || 0,
    tokens: Number(data.tokens) || 0,
    playCount: Number(data.playCount) || 0,
    remaining: Number.isFinite(remaining) ? remaining : DAILY_LIMIT,
    limit: Number(data.limit) || DAILY_LIMIT,
    bonusPurchased: data.bonusPurchased === true,
    bonusPlaysLeft: Number(data.bonusPlaysLeft) || 0,
    bonusPlayNumber: Number(data.bonusPlayNumber) || 0,
    bonusAvailable: data.bonusAvailable === true,
    bonusPlays: Number(data.bonusPlays) || BONUS_PLAYS,
    bonusCost: Number(data.bonusCost) || BONUS_COST,
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

/**
 * Buys today's +3 plays once for 5 tokens. The server checks the Brunei date,
 * the token balance and eligibility, and refuses a second pack the same day.
 */
export async function buyBonusPlays() {
  const requestId =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const res = await base44.functions.invoke("closerSeat", { action: "bonus", requestId });
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
  // Shared "last 5 wins" feed — written after the wallet write, never in place
  // of it, so a feed failure cannot affect the payout above.
  await recordDealbreakerWin({
    user: fresh || user,
    payout,
    method:
      source === "buyout offer" ? LIVE_WIN_METHOD.vipBuyout : LIVE_WIN_METHOD.finalFolder,
  });
  return balanceAfter;
}

/**
 * Credits a Diamond Round win: 1 Diamond into the diamond balance — never chips.
 * The activity history row (TokenTransaction) and the shared Live Activity feed
 * are written after the wallet write, so neither can affect the payout.
 */
export async function creditDiamondPrize({ user, amount = DIAMOND_PRIZE, source }) {
  const gems = Number(amount) || 0;
  if (gems <= 0) return null;
  const fresh = await base44.auth.me();
  const total = (Number(fresh?.diamonds) || 0) + gems;
  await base44.auth.updateMe({ diamonds: total });
  base44.entities.TokenTransaction.create({
    user_id: fresh?.id || user?.id,
    user_name: fresh?.full_name || fresh?.email || "",
    amount: 0,
    source: `Dealbreaker Diamond Round — 💎 ${gems} Diamond (${source})`,
    timestamp: new Date().toISOString(),
  }).catch(() => null);
  await recordDealbreakerWin({
    user: fresh || user,
    payout: 0,
    diamonds: gems,
    method: LIVE_WIN_METHOD.finalFolder,
  });
  return total;
}

/**
 * Dealbreaker Diamond Round progress, stored on that play's own CloserPlay row
 * (slot 3 or slot 6). It keeps the exact shuffled folders, the kept folder and
 * the folders already opened, so a refresh resumes the same paid round instead
 * of losing it — and the two rounds never share state.
 */
export async function saveCloserRound(state, slot) {
  const res = await base44.functions.invoke("closerSeat", {
    action: "round",
    op: "save",
    state,
    slot,
  });
  return res?.data || {};
}

/** The saved Diamond Round for today, if one is in progress, and its slot. */
export async function loadCloserRound() {
  const res = await base44.functions.invoke("closerSeat", { action: "round", op: "load" });
  return {
    round: res?.data?.round || null,
    finished: res?.data?.finished === true,
    slot: Number(res?.data?.slot) || null,
  };
}

/** Closes the round so it can never be resumed or paid twice. */
export async function finishCloserRound(slot) {
  await base44.functions.invoke("closerSeat", { action: "round", op: "finish", slot }).catch(
    () => null
  );
}