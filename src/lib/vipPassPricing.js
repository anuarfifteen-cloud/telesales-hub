import { bruneiToday } from "@/lib/bruneiDay";

/**
 * Progressive monthly VIP pass pricing.
 *
 * Two independent tracks:
 *  - Token track: the 30-minute and 1-hour passes share one purchase counter.
 *  - Diamond track: the 7-Day Priority pass has its own counter.
 *
 * Price = base × 2^purchases already made on that track this Brunei month.
 * Counters live on the user row together with the month they belong to, so a
 * stale month simply reads as zero purchases (baseline prices).
 */

export const VIP_PLUS_BASE_PRICE = 5;
export const DIAMOND_PASS_BASE_PRICE = 1;

/** Current month in Asia/Brunei as YYYY-MM. */
export function bruneiMonthKey() {
  return bruneiToday().slice(0, 7);
}

/** Month-scoped purchase counters — a counter from an older month reads as 0. */
export function passCounters(user) {
  const month = bruneiMonthKey();
  const sameMonth = user?.vip_passes_month === month;
  return {
    month,
    tokenCount: sameMonth ? Math.max(0, Number(user?.token_purchases_this_month) || 0) : 0,
    diamondCount: sameMonth ? Math.max(0, Number(user?.diamond_purchases_this_month) || 0) : 0,
  };
}

/** base × 2^purchases — doubles the price for each pass already bought this month. */
export function escalatedPrice(base, purchases) {
  const b = Math.max(1, Math.round(Number(base) || 0));
  const n = Math.max(0, Math.floor(Number(purchases) || 0));
  return b * Math.pow(2, n);
}