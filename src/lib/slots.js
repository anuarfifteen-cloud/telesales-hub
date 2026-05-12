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
 * Booking opens at 7:30 PM the day before the target date.
 * Returns true if booking is currently allowed for the given date (YYYY-MM-DD).
 */
export function isBookingOpen(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");

  // The day before at 19:30 local time
  const openTime = new Date(target);
  openTime.setDate(openTime.getDate() - 1);
  openTime.setHours(19, 30, 0, 0);

  return now >= openTime;
}

/**
 * Returns the next bookable date (today if before midnight, tomorrow otherwise).
 * We show today + tomorrow so users can always see upcoming slots.
 */
export function getBookableDates() {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const str = d.toISOString().split("T")[0];
    dates.push(str);
  }
  return dates;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}