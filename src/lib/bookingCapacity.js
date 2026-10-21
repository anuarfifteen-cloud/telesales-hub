// Break-slot capacity rules.
//
// A slot holds at most its configured number of bookings. Seats are ordered by
// the database-created timestamp, with the record id breaking an exact tie, so
// every client agrees on the same order — no tier (VIP, VIP Plus, Diamond
// Priority) ever raises a slot's limit.
export function bookingOrder(a, b) {
  return (
    String(a.created_date).localeCompare(String(b.created_date)) ||
    String(a.id).localeCompare(String(b.id))
  );
}

/** { slot_id: maxBookings } for the slots currently in play. */
export function slotLimits(slots) {
  const limits = {};
  (slots || []).forEach((s) => {
    if (s?.id) limits[s.id] = Math.max(1, Number(s.maxBookings) || 1);
  });
  return limits;
}

/**
 * The bookings that must be removed: everything past a slot's limit, keeping
 * the earliest seats. Slots missing from `limits` are left untouched.
 */
export function excessBookings(bookings, limits) {
  const groups = {};
  (bookings || []).forEach((b) => {
    if (!b?.slot_id) return;
    (groups[b.slot_id] = groups[b.slot_id] || []).push(b);
  });

  const excess = [];
  for (const [slotId, list] of Object.entries(groups)) {
    const limit = limits[slotId];
    if (!limit || list.length <= limit) continue;
    excess.push(...[...list].sort(bookingOrder).slice(limit));
  }
  return excess;
}