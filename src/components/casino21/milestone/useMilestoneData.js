import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getSeason, getMyProgress } from "@/lib/milestone";

// Loads the active season + the current user's progress and keeps them fresh.
export default function useMilestoneData(user) {
  const [season, setSeason] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user?.id) return;
    try {
      const s = await getSeason();
      setSeason(s);
      const p = await getMyProgress(
        user.id,
        user.full_name || user.email || "",
        s.season_number
      );
      setProgress(p);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const unsub = base44?.entities?.MilestoneProgress?.subscribe?.(() => reload());
    const unsubSeason = base44?.entities?.MilestoneSeason?.subscribe?.(() => reload());
    return () => {
      unsub && unsub();
      unsubSeason && unsubSeason();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { season, progress, loading, reload };
}