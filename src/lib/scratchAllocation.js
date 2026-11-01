import { base44 } from "@/api/base44Client";

/**
 * Daily Scratch Card allocation.
 *
 * Each player gets 10 cards per half-day batch, strictly on Asia/Brunei time
 * (UTC+8, no DST): batch 1 opens at 00:00 and batch 2 at 12:00. The allowance
 * lives on the player's ScratchCardDaily row, which is refilled to 10 whenever
 * the Brunei date or period on the row no longer matches the current one, so
 * unused cards never roll over.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BRN_OFFSET_MS = 8 * HOUR_MS;

/** Cards granted per batch window. */
export const CARDS_PER_BATCH = 10;

/** Current Asia/Brunei date (YYYY-MM-DD) and half-day period (AM | PM). */
export function bruneiBatch(now = Date.now()) {
  const shifted = now + BRN_OFFSET_MS;
  const hour = Math.floor((shifted % DAY_MS) / HOUR_MS);
  return {
    date: new Date(shifted).toISOString().slice(0, 10),
    period: hour < 12 ? "AM" : "PM",
  };
}

/** Milliseconds until the next batch opens (noon, or midnight). */
export function msToNextBatch(now = Date.now()) {
  const shifted = now + BRN_OFFSET_MS;
  const dayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  const hour = Math.floor((shifted - dayStart) / HOUR_MS);
  const target = dayStart + (hour < 12 ? 12 * HOUR_MS : DAY_MS);
  return Math.max(0, target - shifted);
}

/** "HHh MMm SSs" countdown for the exhausted banner. */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}h ${pad(Math.floor((total % 3600) / 60))}m ${pad(total % 60)}s`;
}

/** Batch number shown to the player: AM is batch 1, PM is batch 2. */
export function batchNumber(period) {
  return period === "PM" ? 2 : 1;
}

/**
 * Reads the player's allocation, creating it on first use or refilling it to 10
 * when the stored date/period no longer matches the current Brunei batch.
 */
export async function loadAllocation(user) {
  if (!user?.id) return null;
  const { date, period } = bruneiBatch();
  const rows = await base44.entities.ScratchCardDaily.filter({ user_id: user.id });
  const record = rows[0];

  if (!record) {
    return await base44.entities.ScratchCardDaily.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Player",
      scratch_batch_date: date,
      scratch_batch_period: period,
      scratch_cards_remaining: CARDS_PER_BATCH,
      // First open of the day is already in the afternoon: nothing was spent in
      // the morning window, so its full 10 stays on record for display.
      scratch_cards_remaining_am: CARDS_PER_BATCH,
    });
  }

  if (record.scratch_batch_date !== date || record.scratch_batch_period !== period) {
    // Rolling from this morning into this afternoon freezes the morning count so
    // Batch 1 stays visible all day. Any other rollover starts a fresh figure.
    const morningLeft =
      period === "PM" && record.scratch_batch_date === date && record.scratch_batch_period === "AM"
        ? Math.max(0, Number(record.scratch_cards_remaining) || 0)
        : CARDS_PER_BATCH;
    return await base44.entities.ScratchCardDaily.update(record.id, {
      scratch_batch_date: date,
      scratch_batch_period: period,
      scratch_cards_remaining: CARDS_PER_BATCH,
      scratch_cards_remaining_am: morningLeft,
    });
  }

  return record;
}

/** Spends one card from the current batch, returning the updated allocation. */
export async function consumeScratchCard(allocation) {
  const remaining = Math.max(0, Number(allocation?.scratch_cards_remaining) || 0);
  if (remaining <= 0) return allocation;
  await base44.entities.ScratchCardDaily.update(allocation.id, {
    scratch_cards_remaining: remaining - 1,
  });
  return { ...allocation, scratch_cards_remaining: remaining - 1 };
}