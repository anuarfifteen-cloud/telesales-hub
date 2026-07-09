// Formats the time remaining until a target date as "Xd Xh Xm"
export function formatCountdown(targetDate) {
  if (!targetDate) return "";
  const ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return "0d 0h 0m";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}