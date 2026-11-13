import { base44 } from "@/api/base44Client";

/**
 * The day's bettors, for the result overlay bubbles.
 *
 * Served by the getDerbyBettors function because HorseBet rows are only
 * readable by their owner — it returns just { user_id, user_name, horse_id }.
 */
export async function loadDayBettors(raceDate) {
  if (!raceDate) return [];
  const res = await base44.functions.invoke("getDerbyBettors", { race_date: raceDate });
  const rows = res?.data?.bettors;
  return Array.isArray(rows) ? rows : [];
}

/** horse_id → the bettors who picked it, in bet order. */
export function groupBettorsByHorse(rows = []) {
  const byHorse = new Map();
  rows.forEach((row) => {
    if (!row?.horse_id) return;
    const list = byHorse.get(row.horse_id) || [];
    list.push(row);
    byHorse.set(row.horse_id, list);
  });
  return byHorse;
}