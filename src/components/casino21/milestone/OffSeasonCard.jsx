import { useEffect, useState } from "react";
import { Flag, Trophy } from "lucide-react";
import {
  countdownParts,
  monthName,
  nextMonthKey,
  nextMonthStartMs,
} from "@/lib/seasonWindow";

const pad = (n) => String(n).padStart(2, "0");

// Shown in place of the Ranked lobby while the season is over. Ranked stays
// locked until 00:00 Brunei on the 1st of the month after the season's month.
export default function OffSeasonCard({ season }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const month = season?.season_month || "";
  const target = month ? nextMonthStartMs(month) : 0;
  const left = target ? target - now : 0;
  const { days, hours, minutes, seconds } = countdownParts(left);
  const nextMonth = month ? monthName(nextMonthKey(month)) : "";

  const champion = season?.season_winner_name || season?.diamond_claimed_by_name || "";
  const byDiamond = season?.ended_by === "diamond" || !!season?.diamond_claimed;
  const championNote = byDiamond
    ? "First to Rank 10 · 💎 1 Diamond Claimed"
    : "Season points leader when the season ended";

  const cells = [
    [days, "DD"],
    [hours, "HH"],
    [minutes, "MM"],
    [seconds, "SS"],
  ];

  return (
    <div
      className="relative rounded-2xl border border-amber-400/40 p-3.5 flex flex-col gap-3 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)" }}
      />

      <div className="relative flex items-center gap-2">
        <Flag className="w-4 h-4 text-amber-300" />
        <span className="text-[12px] font-black uppercase tracking-widest text-amber-200">
          🏁 Season Concluded!
        </span>
      </div>

      {/* Champion */}
      <div className="relative rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 flex-shrink-0 text-amber-300" />
          <p className="text-[12px] font-bold leading-tight text-amber-100">
            🏆 Season Champion:{" "}
            <span className="text-amber-300">{champion || "No Ranked player this season"}</span>
          </p>
        </div>
        <p className="mt-1 pl-6 text-[9.5px] font-bold uppercase tracking-widest text-emerald-100/50">
          {championNote}
        </p>
      </div>

      {/* Live countdown to 00:00 Brunei on the 1st of next month */}
      <div className="relative grid grid-cols-4 gap-1.5">
        {cells.map(([value, label]) => (
          <div
            key={label}
            className="rounded-xl border border-amber-400/25 bg-emerald-950/50 py-2 text-center"
          >
            <p className="text-lg font-black tabular-nums text-amber-300 leading-none">
              {pad(value)}
            </p>
            <p className="mt-1 text-[8.5px] font-black uppercase tracking-widest text-emerald-100/50">
              {label}
            </p>
          </div>
        ))}
      </div>
      <p className="relative -mt-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-amber-200/70">
        Until Next Season
      </p>

      <p className="relative text-[10px] leading-relaxed text-emerald-100/60 text-center">
        Next season kicks off on the 1st of {nextMonth || "next month"} at Brunei Midnight. Casual
        tables are open for practice!
      </p>
    </div>
  );
}