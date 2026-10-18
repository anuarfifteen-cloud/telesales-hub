import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getSeason } from "@/lib/milestone";

// The active season's 🏆RANK score for a player, read straight from their
// MilestoneProgress row. Null while loading; 0 when the player has no row yet
// or their row still belongs to an older season.
export default function useSeasonScore(userId, enabled = true) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    let active = true;
    (async () => {
      try {
        const season = await getSeason();
        const page = await base44.entities.MilestoneProgress.filter(
          { user_id: userId },
          { limit: 10, fields: ["score", "season_number"] }
        );
        const row = (page.items || [])[0];
        const onThisSeason =
          row && Number(row.season_number) === Number(season?.season_number);
        if (active) setScore(onThisSeason ? Number(row.score) || 0 : 0);
      } catch {
        if (active) setScore(0);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, enabled]);

  return score;
}