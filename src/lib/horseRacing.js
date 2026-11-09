import { bruneiToday } from "@/lib/bruneiDay";

/**
 * Daily Horse Racing — shared game constants and Brunei clock helpers.
 *
 * The race is one shared event per Brunei calendar day: betting closes at
 * 12:00 and the day's result is precomputed and saved on the daily race
 * record, so every player replays the same winner.
 */
export const HORSES = [
  { id: "h1", number: 1, name: "Thunder Bay", color: "#f97316", silks: "#7c2d12" },
  { id: "h2", number: 2, name: "Silver Comet", color: "#94a3b8", silks: "#334155" },
  { id: "h3", number: 3, name: "Royal Ember", color: "#e11d48", silks: "#7f1d1d" },
  { id: "h4", number: 4, name: "Midnight Dash", color: "#6366f1", silks: "#312e81" },
  { id: "h5", number: 5, name: "Golden Spur", color: "#eab308", silks: "#713f12" },
  { id: "h6", number: 6, name: "Emerald Flash", color: "#10b981", silks: "#064e3b" },
];

export const STAKE_OPTIONS = [50, 100];
export const PAYOUT_MULTIPLIER = 6;
export const RACE_DURATION_MS = 15000;
export const CLOSE_MINUTES = 12 * 60; // 12:00 Brunei — betting closes, race runs

/** Gross chips returned by a winning bet: 50 → 300, 100 → 600. */
export function grossPayout(stake) {
  return (Number(stake) || 0) * PAYOUT_MULTIPLIER;
}

/**
 * Chips owed for a finishing place: 1st keeps the full win payout, 2nd gets the
 * whole stake back as a consolation, 3rd gets half of it, and 4th–6th nothing.
 */
export function rewardForPlace(place, stake) {
  const s = Number(stake) || 0;
  if (place === 1) return grossPayout(s);
  if (place === 2) return s;
  if (place === 3) return Math.floor(s / 2);
  return 0;
}

/** Minutes since Brunei midnight for the given moment. */
export function bruneiMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Brunei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

export function isBettingOpen(date = new Date()) {
  return bruneiMinutes(date) < CLOSE_MINUTES;
}

export function isRaceDue(date = new Date()) {
  return bruneiMinutes(date) >= CLOSE_MINUTES;
}

export function todayKey() {
  return bruneiToday();
}

export function horseById(horses, id) {
  return (horses || HORSES).find((h) => h.id === id) || null;
}

/** Six independent random odds, generated once per day and saved with the race. */
export function generateOdds() {
  return HORSES.map((h) => ({ ...h, odds: Number((1.5 + Math.random() * 7.5).toFixed(1)) }));
}

/** Winning horse drawn with equal probability, independent of the odds. */
export function pickWinningHorseId() {
  return HORSES[Math.floor(Math.random() * HORSES.length)].id;
}

/** "HH:MM:SS" until the next Brunei noon, or --:--:-- once it has passed. */
export function msUntilNoon(date = new Date()) {
  const mins = bruneiMinutes(date);
  if (mins >= CLOSE_MINUTES) return 0;
  const secondsLeft = (CLOSE_MINUTES - mins) * 60 - date.getSeconds();
  return Math.max(0, secondsLeft * 1000);
}

export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatBruneiDate(key) {
  if (!key) return "";
  try {
    return new Date(`${key}T00:00:00+08:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Brunei",
    });
  } catch {
    return key;
  }
}