import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so every leaderboard shares one PublicProfile fetch.
let cached = null;
let inFlight = null;

// Returns a map of { [userId]: profileRecord } holding every member's public
// display fields — photo, initials, vault tier ring and activity dot. Reads the
// PublicProfile entity because the built-in User entity only lets admins read
// other users. Shared across all mounted leaderboards via a module cache;
// refreshed on PublicProfile subscriptions.
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
          const rows = await base44.entities.PublicProfile.list();
          const m = {};
          rows.forEach((p) => {
            if (p.user_id) m[p.user_id] = { ...p, id: p.user_id };
          });
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
    const unsub = base44.entities.PublicProfile.subscribe(() => { cached = null; load(); });
    return () => { mounted = false; if (unsub) unsub(); };
  }, []);

  return map;
}