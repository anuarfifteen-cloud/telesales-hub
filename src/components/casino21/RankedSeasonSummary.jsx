import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";
import { getSeason } from "@/lib/milestone";

// Ranked ledger summary — the chip balance with the active season's 🏆RANK
// amount directly beneath it, so the seasonal score reads next to the chips it
// was earned from. Shown only in the Ranked ledger tab. A player with no
// progress row yet (or one still on an older season) reads as 0.
export default function RankedSeasonSummary({ userId, chipBalance }) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Chip balance
        </span>
        <span className="ml-auto flex items-center gap-1 text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
          <MiniChipIcon size={13} />
          {Number(chipBalance) || 0}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 border-t border-border pt-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          🏆RANK this season
        </span>
        <span className="ml-auto text-sm font-black tabular-nums text-amber-500">
          {score === null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : score}
        </span>
      </div>
    </div>
  );
}