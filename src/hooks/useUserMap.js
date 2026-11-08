import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Returns a map of { [userId]: profileRecord } holding every member's public
// display fields — photo, initials, vault tier ring and activity dot. Reads the
// PublicProfile entity because the built-in User entity only lets admins read
// other users.
//
// The map is shared by the whole app: one subscription and one refresh at a
// time, no matter how many leaderboards are on screen. PublicProfile rows are
// rewritten every time a member's session syncs, so reloads are collapsed to at
// most one per REFRESH_MS — previously each mounted consumer reloaded the full
// list on every write, which is what pushed the app into the read rate limit.
const REFRESH_MS = 15000;

let cached = null;
let inFlight = null;
let lastLoadedAt = 0;
let refreshTimer = null;
let unsubscribe = null;
const listeners = new Set();

function publish() {
  listeners.forEach((fn) => fn(cached));
}

function fetchProfiles() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const rows = await base44.entities.PublicProfile.list();
      const map = {};
      rows.forEach((p) => {
        if (p.user_id) map[p.user_id] = { ...p, id: p.user_id };
      });
      cached = map;
      lastLoadedAt = Date.now();
      publish();
    } catch {
      // Keep the last good map; the next refresh will try again.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function scheduleRefresh() {
  if (listeners.size === 0) return;
  const wait = lastLoadedAt + REFRESH_MS - Date.now();
  if (wait <= 0) {
    fetchProfiles();
    return;
  }
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    if (listeners.size > 0) fetchProfiles();
  }, wait);
}

function attach() {
  if (unsubscribe) return;
  unsubscribe = base44.entities.PublicProfile.subscribe(() => scheduleRefresh());
}

function detach() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export function useUserMap() {
  const [map, setMap] = useState(cached || {});

  useEffect(() => {
    listeners.add(setMap);
    if (cached) setMap(cached);
    attach();
    // First consumer on a cold or stale cache loads it; the throttle keeps a
    // screen change from re-reading rows another screen just read.
    if (!cached || lastLoadedAt + REFRESH_MS <= Date.now()) fetchProfiles();

    return () => {
      listeners.delete(setMap);
      if (listeners.size === 0) detach();
    };
  }, []);

  return map;
}