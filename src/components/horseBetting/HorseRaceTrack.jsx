import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { RACE_DURATION_MS } from "@/lib/horseRacing";
import {
  isRaceAudioMuted,
  setRaceAudioMuted,
  startRaceAudio,
  stopRaceAudio,
  subscribeRaceAudioMute,
  unlockRaceAudio,
} from "@/lib/raceAudio";
import CartoonHorse from "./CartoonHorse";
import RaceScenery, { SCENE_H, DIRT_TOP } from "./RaceScenery";
import HorseLaneTag from "./HorseLaneTag";

/**
 * Daily Derby — a hand-drawn 2.5D race.
 *
 * Presentation only: the 15-second clock, the saved winner and the replay flow
 * are untouched. The camera, the parallax scenery, the diagonal drift of each
 * runner and the hoof dust all derive from that one progress value, so a replay
 * of the same saved result always looks identical.
 */

const GAIT_MS = 88;
const GAIT = [0, 1, 2, 1];

const FINISH_D = 2.96; // finish post distance in track widths
const CAMERA_C = 2.26; // how far the camera travels
const ORIGIN = 14;

const FEET_Y = 158;
const LANE_GAP = 14;
const BASE_W = 74;

function seed(id = "") {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}
const paceFor = (id) => 0.9 + (seed(id) % 7) / 100; // 0.90 – 0.96 of the winner
const phaseFor = (id) => (seed(id) % 628) / 100;

export default function HorseRaceTrack({ horses = [], winnerId, running, onFinish, onReplay }) {
  const [t, setT] = useState(0);
  const [gait, setGait] = useState(0);
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

  const [audioMuted, setAudioMuted] = useState(isRaceAudioMuted());
  useEffect(() => subscribeRaceAudioMute(setAudioMuted), []);

  // Browsers only play audio after a gesture, so the score unlocks on the first
  // interaction and then follows the race on its own.
  useEffect(() => {
    const unlock = () => unlockRaceAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (running) startRaceAudio(RACE_DURATION_MS / 1000);
    else stopRaceAudio();
    return () => stopRaceAudio();
  }, [running]);

  useEffect(() => {
    if (!running) return undefined;
    setT(0);
    setGait(0);
    startAt.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startAt.current;
      const p = Math.min(1, elapsed / RACE_DURATION_MS);
      setT(p);
      setGait(Math.floor(elapsed / GAIT_MS) % 4);
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
  const pose = GAIT[gait];

  return (
    <div className="flex flex-col gap-2">
      {/* purple outer frame + dark green inner frame, as in the reference */}
      <div
        className="rounded-[22px] p-[3px] shadow-[0_10px_26px_rgba(38,18,58,0.24)]"
        style={{ background: "linear-gradient(150deg,#8c4fb2 0%,#5f2c81 48%,#3d1a57 100%)" }}
      >
        <div className="overflow-hidden rounded-[19px]" style={{ background: "#062a21" }}>
          <div ref={wrapRef} className="relative overflow-hidden" style={{ height: SCENE_H }}>
            <RaceScenery cameraX={cameraX} />

            {/* finish line and post */}
            {finishX > -70 && finishX < width + 70 && (
              <>
                <div
                  className="absolute"
                  style={{ left: finishX, top: DIRT_TOP, bottom: 0, width: 11, zIndex: 4, opacity: 0.9 }}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(255,255,255,0.92) 0 8px, rgba(224,86,86,0.9) 8px 16px)",
                    }}
                  />
                </div>
                <div
                  className="absolute"
                  style={{
                    left: finishX - 1,
                    top: 26,
                    bottom: 0,
                    width: 8,
                    zIndex: 5,
                    backgroundImage:
                      "repeating-linear-gradient(0deg,#ffffff 0 11px,#e25656 11px 22px)",
                    boxShadow: "0 0 0 1px rgba(30,20,10,0.25)",
                  }}
                >
                  <div
                    className="absolute -top-3 left-1"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "14px solid #f6c445",
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                    }}
                  />
                </div>
              </>
            )}

            {/* runners */}
            {horses.map((h, i) => {
              const isWinner = h.id === winnerId;
              const pace = paceFor(h.id);
              const wobble =
                Math.sin(t * 7.2 + phaseFor(h.id)) * 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.1));
              const prog = isWinner ? t : Math.max(0, Math.min(0.97, t * pace + wobble));

              const scale = 0.6 + i * 0.082;
              const w = BASE_W * scale;
              const hgt = w * (118 / 180);
              const feet = FEET_Y + i * LANE_GAP;

              // diagonal running trajectory: each lane drifts and sways a little
              const sway =
                Math.sin(t * Math.PI * 1.5 + phaseFor(h.id)) * 3 * Math.min(1, t * 3) * (1 - 0.35 * t);

              const left = toScreen(distance * prog) - w * 0.5 * prog;
              const top = feet - hgt + sway;
              const blur = running && !isWinner ? 0.3 : 0;

              return (
                <div
                  key={h.id}
                  className="absolute"
                  style={{
                    left: 0,
                    top,
                    width: w,
                    height: hgt,
                    zIndex: isWinner && done ? 24 : 10 + i,
                    transform: `translate3d(${left}px,0,0)`,
                  }}
                >
                  {/* hoof dust trailing behind */}
                  {running && (
                    <span
                      className="pointer-events-none absolute"
                      style={{ left: w * 0.06, bottom: 1, width: w * 0.42, height: hgt * 0.34 }}
                    >
                      <span className="hoof-dust absolute bottom-0 left-2 h-2 w-2 rounded-full bg-[#f7e3c9]" />
                      <span
                        className="hoof-dust absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full bg-[#ecd0ac]"
                        style={{ animationDelay: "0.22s" }}
                      />
                      <span
                        className="hoof-dust absolute bottom-1 left-3 h-1.5 w-1.5 rounded-full bg-white"
                        style={{ animationDelay: "0.45s" }}
                      />
                    </span>
                  )}

                  {/* speed streaks */}
                  {running && (
                    <span className="pointer-events-none absolute" style={{ left: -w * 0.08, top: hgt * 0.3 }}>
                      {[0, 1, 2].map((k) => (
                        <span
                          key={k}
                          className="absolute rounded-full bg-white/70"
                          style={{ width: 9 + k * 5, height: 2, top: k * 6, opacity: 0.45 - k * 0.1 }}
                        />
                      ))}
                    </span>
                  )}

                  <CartoonHorse
                    number={h.number}
                    coat={h.color}
                    silks={h.silks}
                    frame={running ? pose : 0}
                    glow={isWinner && done}
                    blurred={Boolean(blur)}
                    className="h-full w-full"
                  />
                </div>
              );
            })}

            {/* soft vignette so the frame feels lit */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 26px rgba(28,14,6,0.28)" }}
            />
          </div>

          {/* HUD — smooth modern type, no pixel font */}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/75">
                Daily Derby
              </p>
              <p className="truncate text-[11px] font-semibold text-emerald-50">Race at 12:00 · Brunei</p>
            </div>
            <button
              onClick={() => setRaceAudioMuted(!audioMuted)}
              aria-label={audioMuted ? "Unmute race audio" : "Mute race audio"}
              title={audioMuted ? "Unmute race audio" : "Mute race audio"}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-emerald-50 ring-1 ring-white/15 transition hover:bg-white/20"
            >
              {audioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            {done ? (
              <button
                onClick={onReplay}
                className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950 transition hover:brightness-105"
              >
                <RotateCcw className="h-3 w-3" /> Replay
              </button>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-50">
                {running ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Racing
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" /> Ready
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* lane list */}
      <div className="grid grid-cols-2 gap-1.5">
        {horses.map((h) => (
          <HorseLaneTag key={h.id} horse={h} winner={done && h.id === winnerId} />
        ))}
      </div>
    </div>
  );
}