import { fromZonedTime, format as tzFormat } from "date-fns-tz";

const TZ = "Asia/Brunei";

/** Returns today's date string (YYYY-MM-DD) in Brunei timezone from a given Date */
export function todayInBrunei(syncedNow = null) {
  const base = syncedNow ?? new Date();
  return tzFormat(base, "yyyy-MM-dd", { timeZone: TZ });
}

// Standard break slot definitions
export const SLOTS = [
  { id: "AM1", shift: "AM", label: "11:00am – 12:30pm", maxBookings: 1 },
  { id: "AM2", shift: "AM", label: "11:45am – 1:15pm",  maxBookings: 2 },
  { id: "AM3", shift: "AM", label: "1:30pm – 3:00pm",   maxBookings: 2 },
  { id: "PM1", shift: "PM", label: "3:00pm – 4:30pm",   maxBookings: 2 },
  { id: "PM2", shift: "PM", label: "4:30pm – 6:00pm",   maxBookings: 2 },
  { id: "PM3", shift: "PM", label: "6:00pm – 7:30pm",   maxBookings: 1 },
];

// Friday-specific AM slots (PM slots remain standard)
export const FRIDAY_AM_SLOTS = [
  { id: "FAM1", shift: "AM", label: "12:00pm – 2:00pm", maxBookings: 2, restriction: "Men Only" },
  { id: "FAM2", shift: "AM", label: "2:00pm – 3:30pm",  maxBookings: 2, restriction: "Women Only" },
];

/** Returns true if the given dateStr (YYYY-MM-DD) is a Friday */
export function isFriday(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay() === 5;
}

/** Returns the AM slots for the given date (Friday-aware) */
export function getAmSlots(dateStr) {
  return dateStr && isFriday(dateStr) ? FRIDAY_AM_SLOTS : SLOTS.filter((s) => s.shift === "AM");
}

/**
 * Returns a UTC Date for when booking unlocks for the given date string.
 * Unlock = (selectedDate - 1 day) at 19:00:00 Brunei time.
 */
export function getUnlockTime(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);

  // Safe calendar arithmetic: handles 1st-of-month rollover correctly
  const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  targetDate.setDate(targetDate.getDate() - 1);

  const unlockYear = targetDate.getFullYear();
  const unlockMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
  const unlockDay = String(targetDate.getDate()).padStart(2, "0");

  // Interpret 19:30 strictly as Brunei time and return as UTC Date
  const bruneiUnlockTimeStr = `${unlockYear}-${unlockMonth}-${unlockDay}T19:30:00`;
  return fromZonedTime(bruneiUnlockTimeStr, TZ);
}

/**
 * Returns the next 7 dates starting from today in Brunei time.
 * Accepts an optional syncedNow Date (server-corrected) to use instead of device clock.
 */
export function getBookableDates(syncedNow = null) {
  const base = syncedNow ?? new Date();
  // Get today's date string in Brunei time, then step forward day by day
  const todayStr = tzFormat(base, "yyyy-MM-dd", { timeZone: TZ });
  const [year, month, day] = todayStr.split("-").map(Number);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, day + i);
    dates.push(tzFormat(fromZonedTime(d, TZ), "yyyy-MM-dd", { timeZone: TZ }));
  }
  return dates;
}

export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}