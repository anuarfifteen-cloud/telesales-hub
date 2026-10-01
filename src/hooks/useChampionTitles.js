import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so every leaderboard shares one AppSettings fetch for
// defending champion arrays.
let cached = null; // { counts: { [userId]: number }, ids: Set }
let inFlight = null;

// Counts how many defending champion titles a user currently holds across
// Flappy, Super Tap, Ninja Slice and Diamond Smash (per AppSettings).
export function useChampionTitles() {
  const [data, setData] = useState(cached || { counts: {}, ids: new Set() });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (cached) setData(cached);
      if (inFlight) {
        inFlight.then((d) => mounted && setData(d));
        return;
      }
      inFlight = (async () => {
        try {
          const rows = await base44.entities.AppSettings.list();
          const s = rows[0] || {};
          const arrays = [
            s.defending_champ_flappy_ids,
            s.defending_champ_supertap_ids,
            s.defending_champ_ninja_ids,
            s.defending_champ_diamond_ids,
          ];
          const counts = {};
          const ids = new Set();
          arrays.forEach((arr) => {
            (arr || []).forEach((id) => {
              if (!id) return;
              ids.add(id);
              counts[id] = (counts[id] || 0) + 1;
            });
          });
          cached = { counts, ids };
          return cached;
        } catch {
          return cached || { counts: {}, ids: new Set() };
        } finally {
          inFlight = null;
        }
      })();
      const d = await inFlight;
      if (mounted) setData(d);
    };
    load();
    const unsub = base44.entities.AppSettings.subscribe(() => { cached = null; load(); });
    return () => { mounted = false; if (unsub) unsub(); };
  }, []);

  const getChampionCount = (userId) => (userId ? data.counts[userId] || 0 : 0);
  return { getChampionCount, championIds: data.ids };
}