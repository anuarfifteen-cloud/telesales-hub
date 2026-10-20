import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getSeason } from "@/lib/milestone";
import { streakLeader } from "@/lib/milestoneStreak";
import MiniChipIcon from "../MiniChipIcon";

// 🏆RANK live seasonal leaderboard. Reads the open-read MilestoneLeaderboardEntry
// rows for the active season, sorted by score desc. Only Ranked wins add to
// `score`, so the ranking reflects pure Ranked-hand seasonal payouts. The
// private MilestoneProgress records (claims/rewards) stay owner-only.
//
// Each row also carries the player's season-best Ranked win streak, shown
// directly beneath their name. The single top streak with the earliest record
// wears the 💎 Streak Crown and takes the season-end Diamond; anyone who merely
// matches that number later is labelled as a later tie, with no crown or glow.
export default function MilestoneLeaderboard({ user }) {
  const [rows, setRows] = useState([]);
  const [seasonNumber, setSeasonNumber] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const season = await getSeason();
        if (cancelled) return;
        setSeasonNumber(Number(season.season_number));
        const page = await base44.entities.MilestoneLeaderboardEntry.filter(
          { season_number: Number(season.season_number) },
          { sort: "-score", limit: 50 }
        );
        if (cancelled) return;
        setRows(page.items || page || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myId = user?.id;
  const myRow = rows.find((r) => r.user_id === myId);
  const myPosition = myRow ? rows.indexOf(myRow) + 1 : null;
  const myScore = Number(myRow?.score) || 0;

  // The Streak Crown: highest season-best streak, earliest record breaking ties.
  const leader = streakLeader(rows);
  const crownId = leader?.user_id || null;
  const topWins = leader?.wins || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-200/30 border-t-amber-300 animate-spin" />
      </div>
    );
  }

  const medal = (pos) =>
    pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;

  return (
    <div
      className="relative rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-3 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-b-2xl"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
          📊 SEASON LEADERBOARD
        </span>
        {seasonNumber != null && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-emerald-100/70">
            Season {seasonNumber}
          </span>
        )}
      </div>

      {/* Your position summary */}
      <div className="relative rounded-2xl border border-amber-400/30 bg-emerald-950/40 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
          Your Global Position
        </p>
        <div className="flex items-center justify-center gap-3 py-1">
          <span className="text-2xl font-black text-amber-300 tabular-nums">
            {myPosition ? `#${myPosition}` : "—"}
          </span>
          <span className="text-emerald-100/40 text-xl">·</span>
          <span className="flex items-center gap-1.5">
            <MiniChipIcon size={20} />
            <span className="text-2xl font-black text-amber-300 tabular-nums">{myScore}</span>
          </span>
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/60">
          {myPosition ? `Ranked ${myPosition} of ${rows.length} player${rows.length === 1 ? "" : "s"}` : "Play a Ranked hand to enter the board"}
        </p>
      </div>

      {/* Ranked table */}
      <div className="relative rounded-2xl border border-amber-400/20 bg-emerald-950/30 overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_auto] gap-2 px-3 py-2 bg-emerald-950/50 border-b border-amber-400/20">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-200/70">#</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-200/70">Player</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-200/70 text-right">Payouts</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] font-bold text-emerald-100/50">
            No Ranked hands played this season yet. Be the first!
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {rows.map((r, i) => {
              const pos = i + 1;
              const isMe = r.user_id === myId;
              const streakWins = Math.max(0, Number(r.best_streak) || 0);
              const isCrown = r.user_id === crownId;
              const isTiedLater = !isCrown && streakWins > 0 && streakWins === topWins;
              return (
                <div
                  key={r.id || i}
                  className={`grid grid-cols-[2.5rem_1fr_auto] gap-2 px-3 py-2 items-center border-b border-white/5 ${
                    isMe ? "bg-amber-400/15" : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs font-black text-amber-200 tabular-nums">
                    {medal(pos) || `#${pos}`}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isMe ? "text-amber-200" : "text-emerald-100/90"
                      }`}
                    >
                      {r.user_name || "Player"}
                      {isMe && " (You)"}
                    </p>
                    {isCrown ? (
                      <span className="streak-crown-glow mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-100 whitespace-nowrap">
                        👑 💎 Streak Crown · {streakWins} Wins
                      </span>
                    ) : (
                      <p
                        className={`text-[9px] font-bold leading-tight ${
                          isTiedLater ? "text-amber-200/80" : "text-emerald-100/45"
                        }`}
                      >
                        {isTiedLater
                          ? `🔥 ${streakWins} Wins (Tied · Achieved Later)`
                          : `🔥 Best: ${streakWins} Wins`}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center justify-end gap-1 text-xs font-black text-amber-300 tabular-nums">
                    <MiniChipIcon size={12} />
                    {Number(r.score) || 0}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
        Leaderboard ranks seasonal winning payouts from Ranked hands only
        (1–10 chip wagers). Standard Casual play does not count.
      </p>
      <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
        ℹ️ 1 💎 awarded at Season End to the highest Ranked win streak. Earliest record breaks ties.
      </p>
    </div>
  );
}