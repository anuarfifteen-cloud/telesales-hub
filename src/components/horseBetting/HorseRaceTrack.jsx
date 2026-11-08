import { useEffect, useRef, useState } from "react";
import { Flag, Play, RotateCcw } from "lucide-react";
import { RACE_DURATION_MS } from "@/lib/horseRacing";

/** Stable per-horse finishing factor so every replay of a day's race looks identical. */
function laneFactor(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return 0.8 + (h % 17) / 100; // 0.80 – 0.96 of the winner's pace
}

const GALLOP = "M4 18c3-1 4-6 8-6 3 0 4 3 7 3 2 0 3-1 5-2-1 3-1 5 1 8-3 0-4-2-7-2-3 0-4 3-8 3-3 0-4-3-6-4z";

/**
 * Six-lane 15-second race. The movement is animation only — the winner always
 * comes from the saved race record, never from what the animation draws.
 */
export default function HorseRaceTrack({ horses = [], winnerId, running, onFinish, onReplay }) {
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const raf = useRef(null);
  const startAt = useRef(0);

  useEffect(() => {
    // A finished race keeps its final positions on screen until a replay starts.
    if (!running) return undefined;
    setStarted(true);
    setProgress(0);
    startAt.current = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startAt.current) / RACE_DURATION_MS);
      setProgress(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else onFinish?.();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const done = progress >= 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
      <div
        className="relative px-2.5 py-2.5"
        style={{ background: "linear-gradient(165deg,#14532d 0%,#0b3320 55%,#06251a 100%)" }}
      >
        {/* Rail */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 flex justify-end">
          <div
            className="h-full w-2.5 opacity-80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#f8fafc 0 6px,#0f172a 6px 12px)",
            }}
          />
        </div>

        <div className="relative flex flex-col gap-1.5 pr-6">
          {horses.map((h, i) => {
            const isWinner = h.id === winnerId;
            const p = isWinner
              ? progress
              : Math.min(0.97, progress * laneFactor(h.id)) * (done ? 1 : 1);
            const wobble = started && !done ? Math.sin(progress * 46 + i) * 1.1 : 0;
            return (
              <div
                key={h.id}
                className={`relative h-8 rounded-lg transition-colors ${
                  isWinner && done ? "bg-amber-400/15" : "bg-emerald-950/30"
                }`}
              >
                <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-white/10" />
                <div
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1 transition-none"
                  style={{ left: `calc(${p * 100}% - ${p * 26}px)`, transform: `translateY(-50%) translateY(${wobble}px)` }}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black tabular-nums text-white shadow ${
                      isWinner && done ? "ring-2 ring-amber-300" : ""
                    }`}
                    style={{ backgroundColor: h.color, color: h.silks }}
                  >
                    {h.number}
                  </span>
                  <svg
                    viewBox="0 0 32 24"
                    className="h-6 w-8 drop-shadow"
                    style={{ color: h.color }}
                    aria-hidden="true"
                  >
                    <path d={GALLOP} fill="currentColor" />
                    <path d={GALLOP} fill="rgba(0,0,0,0.25)" transform="translate(1.2,0.6)" />
                  </svg>
                </div>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-amber-200/50">
                  {h.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Start / finish markers */}
        <div className="pointer-events-none absolute inset-y-2 left-2.5 w-px bg-white/20" />
        <div className="pointer-events-none absolute inset-y-2 right-9 w-px bg-amber-300/60" />
        <Flag className="pointer-events-none absolute right-8 top-2 h-3 w-3 text-amber-300" />
      </div>

      {!running && !done && (
        <div className="flex items-center justify-center gap-2 border-t border-amber-400/25 bg-emerald-950/60 px-3 py-2">
          <Play className="h-3 w-3 text-amber-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">
            Saved result ready · replay the race
          </span>
        </div>
      )}

      {done && (
        <div className="flex items-center justify-between gap-2 border-t border-amber-400/25 bg-emerald-950/60 px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
            Photo finish
          </span>
          <button
            onClick={onReplay}
            className="flex items-center gap-1 rounded-full border border-amber-400/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-400/10"
          >
            <RotateCcw className="h-3 w-3" /> Replay
          </button>
        </div>
      )}
    </div>
  );
}