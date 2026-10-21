import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Flame } from "lucide-react";
import { getSeason, getMyProgress } from "@/lib/milestone";

// End-of-season briefing: announces the Season Champion (first to Rank 10) and
// the Streak King (highest Ranked win streak). Shown once per
// season per player — the dismissal is stamped on their own progress row.
export default function SeasonBriefingModal({ user }) {
  const [brief, setBrief] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) return;
      try {
        const season = await getSeason();
        const page = await base44.entities.MilestoneSeasonHistory.filter(
          { season_number: { $lt: Number(season.season_number) } },
          { sort: "-season_number", limit: 1 }
        );
        const row = (page.items || page || [])[0];
        if (!row) return;
        const progress = await getMyProgress(
          user.id,
          user.full_name || user.email || "",
          season.season_number
        );
        const seen = Number(progress?.briefing_seen_season) || 0;
        if (alive && Number(row.season_number) > seen) setBrief({ row, progress });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const close = async () => {
    const current = brief;
    setBrief(null);
    try {
      if (current?.progress?.id) {
        await base44.entities.MilestoneProgress.update(current.progress.id, {
          briefing_seen_season: Number(current.row.season_number),
        });
      }
    } catch {
      /* ignore */
    }
  };

  if (!brief) return null;
  const { row } = brief;
  const wins = Number(row.streak_wins) || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3"
        style={{
          background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.4), 0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col items-center text-center gap-1">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-lg font-black text-amber-200 mt-1">
            Season {row.season_number} Wrap-Up
          </h3>
          <p className="text-[11px] text-emerald-100/70 leading-relaxed">
            The season closed when Rank 10 was claimed. Here are your winners.
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">
            🏆 Season Champion
          </p>
          <p className="text-sm font-bold text-amber-100 leading-tight mt-0.5">
            {row.champion_name || "—"}{" "}
            <span className="text-[10px] font-semibold text-emerald-100/60">
              (First to Rank 10)
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">
            <Flame className="inline w-3 h-3 mr-1" />
            Streak King
          </p>
          {wins > 0 ? (
            <>
              <p className="text-sm font-bold text-amber-100 leading-tight mt-0.5">
                {row.streak_winner_name || "—"}{" "}
                <span className="text-[10px] font-semibold text-emerald-100/60">
                  (Highest Streak: {wins} Wins)
                </span>
              </p>
              {row.summary && (
                <p className="text-[10px] text-emerald-100/50 leading-tight mt-1">
                  {row.summary}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-emerald-100/70 leading-tight mt-0.5">
              No Ranked win streak recorded this season.
            </p>
          )}
        </div>

        <button
          onClick={close}
          className="w-full py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 transition"
          style={{ background: "#d4af37" }}
        >
          Start the New Season
        </button>
      </div>
    </div>
  );
}