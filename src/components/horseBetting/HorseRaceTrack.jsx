import { useEffect, useRef, useState } from "react";
import { Flag, Play, RotateCcw } from "lucide-react";
import { RACE_DURATION_MS } from "@/lib/horseRacing";
import PixelHorse from "./PixelHorse";

/**
 * Daily Derby — a 16-bit arcade race.
 *
 * Everything here is presentation only: the 15-second clock, the saved winner
 * and the replay flow are untouched. The camera, the scrolling parallax track
 * and the horses' positions are all derived from that one progress value, so a
 * replay of the same saved result always looks identical.
 */

const GALLOP_MS = 95;
const TRACK_H = 216;
const TREE_H = 40;
const FENCE_TOP = 40;
const DIRT_TOP = 52;
const ROW_START = 58;
const ROW_GAP = 24;
const SPRITE_W = 44;
const ORIGIN = 10;

// Camera geometry in track widths. The finish post sits at 2.96 widths and the
// camera travels 2.26, so the post stays off-screen until about t = 0.867 (the
// last two seconds) and then pans in from the right to meet the winner.
const FINISH_D = 2.96;
const CAMERA_C = 2.26;

const TREES =
  "radial-gradient(circle at 16px 32px, #1f6b30 0 17px, transparent 17px), radial-gradient(circle at 46px 34px, #175a28 0 15px, transparent 15px), radial-gradient(circle at 32px 21px, #2a8a3d 0 11px, transparent 11px)";

const DIRT =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.34) 0 2px, transparent 2px 24px), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 9px), radial-gradient(circle at 40px 18px, rgba(255,214,150,0.12) 0 2px, transparent 2px)";

function seed(id = "") {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}
const paceFor = (id) => 0.86 + (seed(id) % 10) / 100; // 0.86 – 0.95 of the winner
const phaseFor = (id) => (seed(id) % 628) / 100;

export default function HorseRaceTrack({ horses = [], winnerId, running, onFinish, onReplay }) {
  const [t, setT] = useState(0);
  const [frame, setFrame] = useState(0);
  const [width, setWidth] = useState(360);
  const wrapRef = useRef(null);
  const raf = useRef(null);
  const startAt = useRef(0);

  useEffect(() => {
    const measure = () => setWidth(wrapRef.current?.clientWidth || 360);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    setT(0);
    setFrame(0);
    startAt.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startAt.current;
      const p = Math.min(1, elapsed / RACE_DURATION_MS);
      setT(p);
      setFrame(Math.floor(elapsed / GALLOP_MS) % 4);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else onFinish?.();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const done = t >= 1;
  const distance = FINISH_D * width;
  const cameraX = CAMERA_C * width * t;
  const toScreen = (worldX) => worldX - cameraX + ORIGIN;
  const finishX = toScreen(distance);

  return (
    <div className="overflow-hidden rounded-xl border-2 border-black shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: TRACK_H, backgroundColor: "#3e1e07" }}
      >
        {/* Treeline */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: TREE_H,
            backgroundColor: "#0e2b1b",
            backgroundImage: TREES,
            backgroundSize: "64px 44px",
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${-(cameraX * 0.18)}px 0`,
          }}
        />

        {/* Dirt straight — scrolls at full speed */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            top: DIRT_TOP,
            backgroundImage: DIRT,
            backgroundPosition: `${-cameraX}px 0`,
            boxShadow: "inset 0 8px 14px rgba(0,0,0,0.5)",
          }}
        />

        {/* White rail fence */}
        <div className="absolute inset-x-0" style={{ top: FENCE_TOP, height: 12 }}>
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#f2f0e4]" />
          <div className="absolute inset-x-0 top-[5px] h-[2px] bg-[#cfcbb8]" />
          <div
            className="absolute inset-x-0 bottom-0 top-[2px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#f2f0e4 0 3px, transparent 3px 22px)",
              backgroundPosition: `${-(cameraX * 0.5)}px 0`,
            }}
          />
        </div>

        {/* Start gate — scrolls away with the world */}
        <div
          className="absolute w-1"
          style={{
            top: DIRT_TOP,
            bottom: 0,
            transform: `translate3d(${toScreen(0)}px,0,0)`,
            backgroundImage:
              "repeating-linear-gradient(0deg,#f2f0e4 0 7px, #1f2937 7px 14px)",
            opacity: 0.75,
            zIndex: 5,
          }}
        />

        {/* Checkered finish post — pans in from the right for the last two seconds */}
        <div
          className="absolute"
          style={{ top: DIRT_TOP, bottom: 0, width: 14, transform: `translate3d(${finishX}px,0,0)`, zIndex: 6 }}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: "repeating-conic-gradient(#f8fafc 0 25%, #1f2937 0 50%)",
              backgroundSize: "7px 7px",
            }}
          />
          <Flag className="absolute -top-4 left-0 h-4 w-4 text-[#f7d85e]" />
        </div>

        {/* Runners */}
        {horses.map((h, i) => {
          const isWinner = h.id === winnerId;
          const prog = isWinner
            ? t
            : Math.max(
                0,
                Math.min(
                  0.99,
                  t * paceFor(h.id) +
                    0.05 * Math.sin(t * 8 + phaseFor(h.id)) * Math.min(1, t * 3) * (1 - t) +
                    (((seed(h.id) % 3) - 1) * 0.05 * Math.sin(Math.PI * t))
                )
              );
          // The horse's nose reaches the post as it finishes: shift back a little
          // more the further it has travelled, so the winner's head crosses first.
          const screenX = toScreen(distance * prog) - SPRITE_W * 0.62 * prog;
          const bob = running ? Math.sin(t * 34 + phaseFor(h.id)) * 1.6 : 0;
          const scale = 0.88 + i * 0.04;
          const top = ROW_START + i * ROW_GAP;

          return (
            <div
              key={h.id}
              className="absolute"
              style={{
                top,
                left: 0,
                width: SPRITE_W,
                zIndex: 10 + i,
                transform: `translate3d(${screenX}px, ${bob}px, 0) scale(${scale})`,
                transformOrigin: "bottom left",
                filter: isWinner && done ? "drop-shadow(0 0 6px rgba(247,216,94,0.95))" : "none",
              }}
            >
              {/* ground shadow */}
              <div
                className="absolute"
                style={{
                  left: 6,
                  bottom: 0,
                  width: 34,
                  height: 5,
                  background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 70%)",
                }}
              />
              {running && (
                <span className="pointer-events-none absolute" style={{ left: -2, bottom: 2, width: 10, height: 8 }}>
                  <span className="race-dust" />
                  <span className="race-dust race-dust-2" />
                </span>
              )}
              <PixelHorse frame={frame} coat={h.color} silk={h.silks} width={SPRITE_W} />
              <span
                className="font-pixel absolute -top-1.5 left-0 px-[2px] py-[1px] text-[6px] leading-none"
                style={{ background: "#000", color: "#f7d85e" }}
              >
                {h.number}
              </span>
            </div>
          );
        })}

        {/* Arcade scanlines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 3px)" }}
        />
      </div>

      {/* Black HUD panel */}
      <div className="bg-black px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-pixel text-[7px] leading-none text-[#f7d85e]">THE DAILY DERBY</span>
          {done ? (
            <button
              onClick={onReplay}
              className="font-pixel flex items-center gap-1 rounded-sm border border-[#f7d85e] px-1.5 py-1 text-[6px] leading-none text-[#f7d85e] hover:bg-[#f7d85e]/15"
            >
              <RotateCcw className="h-2.5 w-2.5" /> REPLAY
            </button>
          ) : (
            <span className="font-pixel flex items-center gap-1 text-[6px] leading-none text-[#7f9eff]">
              {running ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 animate-pulse bg-[#278f24]" /> RACING
                </>
              ) : (
                <>
                  <Play className="h-2.5 w-2.5" /> SAVED RESULT
                </>
              )}
            </span>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
          {horses.map((h) => (
            <span key={h.id} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 shrink-0" style={{ background: h.silks }} />
              <span className="font-pixel truncate text-[6px] leading-none text-[#cfcfcf]">
                {h.number} {String(h.name || "").toUpperCase()}
              </span>
            </span>
          ))}
        </div>
        {done && (
          <p className="font-pixel mt-1.5 text-[6px] leading-none text-[#f7d85e]">PHOTO FINISH</p>
        )}
      </div>
    </div>
  );
}