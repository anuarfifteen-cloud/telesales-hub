// Client-side host lease + presence helpers.
//
// The host's browser is the sole writer of the ActiveTable row for game actions.
// Previously the host was simply the lowest-numbered seated player, so if that
// player closed their tab the engine stopped and the table froze — queued JOINs
// were never processed and stale seats were never cleaned up.
//
// A time-based lease fixes this: the active host renews host_lease_expires_at
// every tick. When the lease expires any eligible active player claims it, so
// processing continues. Combined with presence heartbeats (seated clients ping
// the host every few seconds), the engine can tell connected-but-idle players
// apart from players whose browsers are gone and free their seats.

import { normalizeSeats } from "./mpEngine";

export const LEASE_MS = 5000; // how long the host lease stays valid without renewal
export const LEASE_RENEW_THRESHOLD = 2500; // renew when less than this remains (renews ~every 2-3 ticks)
export const PRESENCE_TIMEOUT_MS = 20000; // a seat not seen in this window is considered gone
export const HEARTBEAT_INTERVAL_MS = 8000; // how often seated clients send a presence heartbeat

// Who SHOULD hold the host lease right now. Returns a user_id or "".
// The current host keeps the lease while it is valid and they are still seated.
// When the lease expires, the lowest-numbered seated player who is NOT the dead
// host claims it (so a dead seat-1 host hands off to a live seat-2 player).
export function effectiveHostId(table, now) {
  const seats = normalizeSeats(table?.seats);
  const seated = seats.filter((s) => s.user_id);
  if (!seated.length) return "";

  const currentHost = table?.host_user_id || "";
  const leaseValid = Number(table?.host_lease_expires_at || 0) > now;

  if (currentHost && leaseValid && seated.some((s) => s.user_id === currentHost)) {
    return currentHost;
  }

  // Lease expired or host no longer seated — pick the lowest alive seat.
  // Prefer a player who is NOT the dead/absent host so a live seat-2 can take
  // over from a dead seat-1. If only the dead host remains, they keep the seat
  // (they'll renew the lease when they return).
  const alive = seated.filter((s) => s.user_id !== currentHost);
  if (alive.length) {
    alive.sort((a, b) => a.seat_id - b.seat_id);
    return alive[0].user_id;
  }
  return currentHost || "";
}

// Should this client's browser run the table engine this tick?
export function shouldRunEngine(table, user, now) {
  if (!user?.id || !table) return false;
  return effectiveHostId(table, now) === user.id;
}

// Does the lease need a claim or renewal write?
export function needsLeaseWrite(table, userId, now) {
  const isCurrentHost = table?.host_user_id === userId;
  const remaining = Number(table?.host_lease_expires_at || 0) - now;
  return !isCurrentHost || remaining < LEASE_RENEW_THRESHOLD;
}