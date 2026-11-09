import { RotateCcw } from "lucide-react";
import { raceResults } from "@/lib/derbyFinish";
import RacerSprite from "./RacerSprite";

const PLACE_BADGE = [
  "bg-amber-300 text-amber-950",
  "bg-slate-200 text-slate-700",
  "bg-orange-300 text-orange-950",
];

/**
 * The official result, laid over the finished track: every runner from 1st to
 * 6th with its time to the hundredth, and the replay control.
 */
export default function RaceResultsOverlay({ horses, winnerId, onReplay }) {
  const rows = raceResults(horses, winnerId);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-center gap-1.5 px-2.5 py-2"
      style={{ background: "rgba(4,26,19,0.88)", backdropFilter: "blur(3px)" }}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">Official result</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-200/60">Finish time</p>
      </div>

      <div className="flex flex-col gap-[3px]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-[3px]"
            style={{
              background: row.place === 1 ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.05)",
              boxShadow: row.place === 1 ? "inset 0 0 0 1px rgba(252,211,77,0.45)" : "none",
            }}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                PLACE_BADGE[row.place - 1] || "bg-white/10 text-emerald-100"
              }`}
            >
              {row.place}
            </span>
            <span className="relative h-6 w-6 shrink-0">
              <RacerSprite horseId={row.id} size={24} frame={0} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-emerald-50">
              <span style={{ color: row.color }}>{row.number}</span> {row.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-amber-200">{row.time}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onReplay}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-full bg-amber-300 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-950 shadow-[0_3px_12px_rgba(212,175,55,0.45)] transition hover:brightness-105"
      >
        <RotateCcw className="h-3 w-3" /> Replay race
      </button>
    </div>
  );
}