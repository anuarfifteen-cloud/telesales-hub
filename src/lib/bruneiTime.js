const TZ = "Asia/Brunei";

/**
 * Format a UTC date string to Brunei local time (UTC+8).
 * Output: e.g. "19 May, 2:17 am"
 */
export function formatBruneiTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}