import { useEffect, useRef, useState } from "react";
import { Flag, Play, RotateCcw } from "lucide-react";
import { RACE_DURATION_MS } from "@/lib/horseRacing";
import HorseSprite from "./HorseSprite";

/** Stable per-horse finishing factor so every replay of a day's race looks identical. */
function laneFactor(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return 0.8 + (h % 17) / 100; // 0.80 – 0.96 of the winner's pace
}

const DASH_LINE = "repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 3px, transparent 3px 9px)";
const DIRT_SPECKLE =
  "repeating-linear-gradient(90deg, rgba(122,79,28,0.5) 0 2px, transparent 2px 13px), repeating-linear-gradient(0deg, rgba(122,79,28,0.4) 0 1px, transparent 1px 9px)";

/**
 * Six-lane 15-second race over a retro pixel-art dirt track: hedge rail along the
 * top, earth rows between, checkered finish post on the right. The movement is
 * animation only — the winner always comes from the saved race record, never
 * from what the animation draws.
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
    <div className="relative overflow-hidden rounded-2xl border border-amber-950/50 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
      {/* Hedge line across the back of the track */}
      <div
        className="h-4 w-full border-b-2 border-emerald-950/60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 5px, transparent 5px 11px), linear-gradient(#9ed35c, #4c8a2c)",
        }}
      />

      {/* Dirt straight */}
      <div
        className="relative px-1.5 py-1.5"
        style={{ background: "linear-gradient(#e6cfa6 0%, #d6b988 45%, #c2a273 100%)" }}
      >
        {/* Dirt speckle + faint tyre grooves */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{ backgroundImage: DIRT_SPECKLE }}
        />

        <div className="relative mr-2 flex flex-col">
          {horses.map((h, i) => {
            const isWinner = h.id === winnerId;
            const p = isWinner ? progress : Math.min(0.97, progress * laneFactor(h.id));
            const wobble = started && !done ? Math.sin(progress * 46 + i) * 1.2 : 0;
            return (
              <div
                key={h.id}
                className={`relative h-8 border-b border-dashed border-[#8a6a3e]/35 last:border-b-0 ${
                  isWinner && done ? "bg-amber-300/35" : i % 2 ? "bg-black/[0.04]" : ""
                }`}
              >
                <div
                  className="absolute top-1/2"
                  style={{
                    left: `calc(${p * 100}% - ${p * 40}px)`,
                    transform: `translateY(-50%) translateY(${wobble}px)`,
                  }}
                >
                  <HorseSprite
                    number={h.number}
                    width={40}
                    className="drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
                  />
                </div>
                <span
                  className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider ${
                    isWinner && done ? "text-amber-900" : "text-[#7a5a2c]/60"
                  }`}
                >
                  {h.number} · {h.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Start line */}
        <div
          className="pointer-events-none absolute inset-y-1.5 left-1.5 w-1 opacity-70"
          style={{ backgroundImage: DASH_LINE, backgroundSize: "auto 7px" }}
        />
        {/* Checkered finish post */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2.5 border-l border-amber-950/40"
          style={{
            backgroundImage: "repeating-conic-gradient(#f8fafc 0 25%, #1f2937 0 50%)",
            backgroundSize: "8px 8px",
          }}
        />
        <Flag className="pointer-events-none absolute right-3 top-0.5 h-3 w-3 text-amber-950/80" />
      </div>

      {!running && !done && (
        <div className="flex items-center justify-center gap-2 border-t border-amber-950/30 bg-[#3b2a16] px-3 py-2">
          <Play className="h-3 w-3 text-amber-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">
            Saved result ready · replay the race
          </span>
        </div>
      )}

      {done && (
        <div className="flex items-center justify-between gap-2 border-t border-amber-950/30 bg-[#3b2a16] px-3 py-2">
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