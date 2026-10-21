// Brunei calendar months (UTC+8, no DST) — the window a Ranked season runs in.
export const BRUNEI_OFFSET_MS = 8 * 60 * 60 * 1000;

// Current Brunei month as "YYYY-MM".
export function bruneiMonthKey(date = new Date()) {
  const d = new Date(date.getTime() + BRUNEI_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// The month after "YYYY-MM".
export function nextMonthKey(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return "";
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// Epoch ms of 00:00 Brunei on the 1st of the month after `monthKey`.
export function nextMonthStartMs(monthKey) {
  const next = nextMonthKey(monthKey);
  const [y, m] = next.split("-").map(Number);
  if (!y || !m) return 0;
  return Date.UTC(y, m - 1, 1) - BRUNEI_OFFSET_MS;
}

function monthDate(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1));
}

// "November" — used in the off-season caption.
export function monthName(monthKey) {
  const d = monthDate(monthKey);
  return d ? d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }) : "";
}

// "November 2026" — used in the admin status pill.
export function monthLabel(monthKey) {
  const d = monthDate(monthKey);
  return d
    ? d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : "";
}

export function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}