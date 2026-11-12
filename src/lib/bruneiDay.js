import { networkNow } from "./networkTime";

/**
 * Today's date as YYYY-MM-DD on the Asia/Brunei calendar.
 *
 * The day key for once-per-day rewards (Daily Spin, daily free chip gift,
 * Daily Mystery Card and missions, Perfect 10 free tries) — read from the
 * network-anchored clock, so moving the device clock cannot roll a daily
 * reset early. Until the first successful sync the clock falls back to device
 * time (see networkTime.js), and the last verified time is reused after that.
 */
export function bruneiToday(at = networkNow()) {
  return new Date(at).toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
}