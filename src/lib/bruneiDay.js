/**
 * Today's date as YYYY-MM-DD on the Asia/Brunei calendar.
 *
 * The day key for once-per-day rewards (Daily Spin, daily free chip gift) —
 * always derived from the device clock in Brunei time so the reset lands at
 * Brunei 00:00 rather than the player's local midnight.
 */
export function bruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
}