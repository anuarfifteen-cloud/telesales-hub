import { useEffect, useRef, useState } from "react";
import { Flag, Trophy } from "lucide-react";
import {
  countdownParts,
  monthLabel,
  nextMonthKey,
  nextMonthStartMs,
} from "@/lib/seasonWindow";

const pad = (n) => String(n).padStart(2, "0");

const CELLS = [
  ["days", "Days"],
  ["hours", "Hours"],
  ["minutes", "Mins"],
  ["seconds", "Secs"],
];

// Hero countdown shown on the Milestones sub-tab once a season has ended. It
// stands in for the season payout summary and Daily Missions so the next
// season's start is the first thing a player sees.
export default function SeasonCountdownCard({ season, onExpire }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const month = season?.season_month || "";
  const target = month ? nextMonthStartMs(month) : 0;
  const left = target ? Math.max(0, target - now) : 0;
  const parts = countdownParts(left);
  const nextMonth = month ? nextMonthKey(month) : "";
  const nextLabel = nextMonth ? monthLabel(nextMonth) : "";

  // The timer hitting zero means the new Brunei month has begun — ask the
  // parent to re-read the season so the normal rollover reopens Ranked.
  useEffect(() => {
    if (!target || fired.current || left > 0) return;
    fired.current = true;
    onExpire?.();
  }, [left, target, onExpire]);

  const champion = season?.season_winner_name || season?.diamond_claimed_by_name || "";
  const byDiamond = season?.ended_by === "diamond" || !!season?.diamond_claimed;

  return (
    <div
      className="relative rounded-2xl border border-amber-400/40 p-4 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% -10%, rgba(212,175,55,0.22) 0%, transparent 60%), linear-gradient(160deg, #234c3c 0%, #0f2b22 62%, #081713 100%)",
        boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
      }}
    >
      {/* Gold inner trim + slow breathing halo */}
      <div
        className="pointer-events-none absolute inset-1.5 rounded-[14px]"
        style={{ border: "1px solid rgba(212,175,55,0.28)" }}
      />
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full animate-pulse"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.28) 0%, transparent 70%)" }}
      />

      <div className="relative flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-emerald-950/50 px-2.5 py-1">
          <Flag className="h-3 w-3 text-amber-300" />
          <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-amber-200">
            Season Concluded
          </span>
        </div>

        <h3
          className="mt-2.5 text-[15px] font-black uppercase leading-tight tracking-widest text-amber-300"
          style={{ fontFamily: "Cinzel, serif" }}
        >
          New Season Starts In
        </h3>

        {/* Big time cells */}
        <div className="mt-3 grid w-full grid-cols-4 gap-1.5">
          {CELLS.map(([key, label]) => (
            <div
              key={key}
              className="rounded-xl border border-amber-400/30 py-2.5"
              style={{
                background: "linear-gradient(180deg, rgba(6,26,21,0.85) 0%, rgba(3,15,12,0.95) 100%)",
                boxShadow: "inset 0 1px 0 rgba(254,241,201,0.12)",
              }}
            >
              <p
                className="text-[26px] font-black leading-none tabular-nums text-amber-300"
                style={{ textShadow: "0 2px 10px rgba(212,175,55,0.35)" }}
              >
                {pad(parts[key])}
              </p>
              <p className="mt-1 text-[8.5px] font-black uppercase tracking-widest text-emerald-100/45">
                {label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/75">
          {nextLabel ? `Unlocks 1 ${nextLabel.split(" ")[0]} · 00:00 Brunei` : "Unlocks next month · 00:00 Brunei"}
        </p>

        {champion ? (
          <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-amber-400/25 bg-emerald-950/40 px-3 py-2 text-left">
            <Trophy className="h-4 w-4 flex-shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-bold leading-tight text-amber-100">
                🏆 Season Champion:{" "}
                <span className="text-amber-300">{champion}</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-100/45">
                {byDiamond ? "First to Rank 10 · 💎 Diamond claimed" : "Season points leader"}
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-2.5 text-[10px] leading-relaxed text-emerald-100/55">
          Ranked reopens automatically when the timer hits zero. Casual tables stay open for
          practice in the meantime.
        </p>
      </div>
    </div>
  );
}