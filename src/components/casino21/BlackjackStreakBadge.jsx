import { Flame, Trophy } from "lucide-react";

const PILL =
  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest";

/**
 * The player's Blackjack 21 win streak, shown in the result of both tables: the
 * run they are on right now and their best ever. On the win that reached 5, 10
 * or 20 in a row it also names the chip bonus just paid — which counts toward
 * the seasonal 🏆RANK score as well as the chip balance.
 */
export default function BlackjackStreakBadge({
  streak = 0,
  best = 0,
  bonus = 0,
  reached = [],
  className = "",
}) {
  const run = Math.max(0, Number(streak) || 0);
  const top = Math.max(run, Number(best) || 0);
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="flex items-center justify-center gap-2">
        <span
          className={`${PILL} ${run > 0 ? "animate-pulse" : ""}`}
          style={{
            background: run > 0 ? "rgba(244,63,94,0.16)" : "rgba(6,40,30,0.66)",
            border: `1px solid ${run > 0 ? "rgba(244,63,94,0.45)" : "rgba(52,211,153,0.2)"}`,
            color: run > 0 ? "#fecdd3" : "rgba(209,250,229,0.6)",
          }}
        >
          <Flame className="w-3 h-3" />
          {run > 0 ? `${run} Win Streak` : "Streak broken"}
        </span>
        <span
          className={PILL}
          style={{
            background: "rgba(212,175,55,0.14)",
            border: "1px solid rgba(212,175,55,0.45)",
            color: "#f7d774",
          }}
        >
          <Trophy className="w-3 h-3" />
          Best {top}
        </span>
      </div>
      {bonus > 0 && (
        <span
          className={PILL}
          style={{ background: "linear-gradient(135deg,#d4af37 0%,#fef1c9 100%)", color: "#0d2a24" }}
        >
          🔥 {reached.length ? reached.join(" & ") : run} Win Streak · +{bonus} chips +{bonus} 🏆RANK
        </span>
      )}
    </div>
  );
}