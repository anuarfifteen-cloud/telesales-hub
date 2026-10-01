import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so every leaderboard shares one User.list() fetch.
let cached = null;
let inFlight = null;

// Returns a map of { [userId]: userRecord }. Shared across all mounted
// leaderboards via a module cache; refreshed on User entity subscriptions.
export function useUserMap() {
  const [map, setMap] = useState(cached || {});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (cached) setMap(cached);
      if (inFlight) {
        inFlight.then((m) => mounted && setMap(m));
        return;
      }
      inFlight = (async () => {
        try {
          const users = await base44.entities.User.list();
          const m = {};
          users.forEach((u) => { if (u.id) m[u.id] = u; });
          cached = m;
          return m;
        } catch {
          return cached || {};
        } finally {
          inFlight = null;
        }
      })();
      const m = await inFlight;
      if (mounted) setMap(m);
    };
    load();
    const unsub = base44.entities.User.subscribe(() => { cached = null; load(); });
    return () => { mounted = false; if (unsub) unsub(); };
  }, []);

  return map;
}