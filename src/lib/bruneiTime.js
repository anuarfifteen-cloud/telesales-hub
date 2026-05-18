import { format, toZonedTime } from "date-fns-tz";

const TZ = "Asia/Brunei";

/**
 * Format a UTC date string to Brunei local time (UTC+8).
 * Output: e.g. "19 May, 10:30 AM"
 */
export function formatBruneiTime(dateStr) {
  const zoned = toZonedTime(new Date(dateStr), TZ);
  return format(zoned, "d MMM, h:mm aa", { timeZone: TZ });
}