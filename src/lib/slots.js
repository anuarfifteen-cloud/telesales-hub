import { toZonedTime, format as tzFormat } from "date-fns-tz";

const TZ = "Asia/Brunei";

/** Returns a Date object representing "now" in Brunei time */
function nowInBrunei() {
  return toZonedTime(new Date(), TZ);
}

/** Returns today's date string (YYYY-MM-DD) in Brunei time */
function todayInBrunei() {
  return tzFormat(toZonedTime(new Date(), TZ), "yyyy-MM-dd", { timeZone: TZ });
}

// Break slot definitions
export const SLOTS = [
  { id: "AM1", shift: "AM", label: "11:00am – 12:30pm", maxBookings: 1 },
  { id: "AM2", shift: "AM", label: "11:45am – 1:15pm",  maxBookings: 2 },
  { id: "AM3", shift: "AM", label: "1:30pm – 3:00pm",   maxBookings: 2 },
  { id: "PM1", shift: "PM", label: "3:00pm – 4:30pm",   maxBookings: 2 },
  { id: "PM2", shift: "PM", label: "4:30pm – 6:00pm",   maxBookings: 2 },
  { id: "PM3", shift: "PM", label: "6:00pm – 7:30pm",   maxBookings: 1 },
];

/**
 * Booking opens at 6:00 AM Brunei time on the day itself only.
 * Returns true if booking is currently allowed for the given date (YYYY-MM-DD).
 */
export function isBookingOpen(dateStr) {
  const bruneiNow = nowInBrunei();
  const bruneiToday = todayInBrunei();

  // Only today (in Brunei) is bookable
  if (dateStr !== bruneiToday) return false;

  // Opens at 06:00 AM Brunei time
  return bruneiNow.getHours() >= 6;
}

/**
 * Returns the next 7 dates starting from today in Brunei time.
 */
export function getBookableDates() {
  const dates = [];
  // Get today in Brunei as a base
  const bruneiNow = nowInBrunei();
  for (let i = 0; i < 7; i++) {
    const d = new Date(bruneiNow);
    d.setDate(bruneiNow.getDate() + i);
    const str = tzFormat(d, "yyyy-MM-dd", { timeZone: TZ });
    dates.push(str);
  }
  return dates;
}

export function formatDate(dateStr) {
  // Parse as local date (no TZ shift needed — dateStr is already Brunei date)
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}