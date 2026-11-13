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
import { DUST_PUFF } from "@/lib/derbyArt";
import { paceFor as paceOf, phaseFor } from "@/lib/derbyFinish";
import RacerSprite from "./RacerSprite";
import RaceResultsOverlay from "./RaceResultsOverlay";
import RaceScenery, { SCENE_H, DIRT_TOP } from "./RaceScenery";
import { BOARD_H, RAIL_H } from "./SponsorRail";
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

const FINISH_D = 2.96; // finish post distance in track widths
const CAMERA_C = 2.26; // how far the camera travels
const ORIGIN = 14;

/* The finish post is capped so it terminates cleanly at the bottom of the rail
   and never runs up over the sponsor adboards. */
const POST_TOP = BOARD_H + RAIL_H;

const FEET_Y = 136;
const LANE_GAP = 36;
const BASE_W = 76;

// Shared with the roster and the bet card, so the order on screen, the places
// shown after the race and the drawn race all come from the same numbers.
const paceFor = paceOf;

export default function HorseRaceTrack({ horses = [], winnerId, running, onFinish, onReplay, preRace, bet, raceDate }) {
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
                  style={{ left: finishX, top: DIRT_TOP, bottom: 0, width: 15, zIndex: 4, opacity: 0.9 }}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(255,255,255,0.92) 0 10px, rgba(224,86,86,0.9) 10px 20px)",
                    }}
                  />
                </div>
                <div
                  className="absolute"
                  style={{
                    left: finishX - 1,
                    top: POST_TOP,
                    bottom: 0,
                    width: 10,
                    zIndex: 5,
                    backgroundImage:
                      "repeating-linear-gradient(0deg,#ffffff 0 14px,#e25656 14px 28px)",
                    boxShadow: "0 0 0 1px rgba(30,20,10,0.25)",
                  }}
                >
                  <div
                    className="absolute left-2"
                    style={{
                      top: 4,
                      width: 0,
                      height: 0,
                      borderLeft: "19px solid #f6c445",
                      borderTop: "7px solid transparent",
                      borderBottom: "7px solid transparent",
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

              // Every runner is drawn at exactly the same size — no lane-based
              // perspective scaling, so the field reads as one 1:1 scale.
              const scale = 0.82;
              const w = BASE_W * scale;
              const hgt = w; // sprite cells are square, feet sit on the cell's bottom edge
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
                    // Strict lane depth: the layer is fixed by the lane alone, so a
                    // nearer lane (higher index) always paints over a farther one,
                    // no matter who is ahead, crossing or leading.
                    zIndex: 10 + i,
                    transform: `translate3d(${left}px,0,0)`,
                  }}
                >
                  {/* hand-drawn dust puffs kicked up behind the hooves */}
                  {running && (
                    <span
                      className="pointer-events-none absolute"
                      style={{ left: -w * 0.18, bottom: hgt * 0.02, width: w * 0.46, height: hgt * 0.3 }}
                    >
                      {[
                        { left: "0%", bottom: "0%", size: 78, delay: "0s", opacity: 0.95 },
                        { left: "26%", bottom: "12%", size: 56, delay: "0.24s", opacity: 0.8 },
                        { left: "52%", bottom: "4%", size: 40, delay: "0.46s", opacity: 0.65 },
                      ].map((p) => (
                        <span
                          key={p.left}
                          className="hoof-dust absolute"
                          style={{
                            left: p.left,
                            bottom: p.bottom,
                            width: `${p.size}%`,
                            height: `${p.size}%`,
                            opacity: p.opacity,
                            animationDelay: p.delay,
                            backgroundImage: `url(${DUST_PUFF})`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      ))}
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

                  <RacerSprite
                    horseId={h.id}
                    number={h.number || i + 1}
                    size={w}
                    frame={running ? gait : 0}
                    glow={isWinner && done}
                    blurred={Boolean(blur)}
                  />
                </div>
              );
            })}

            {/* soft vignette so the frame feels lit */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 26px rgba(28,14,6,0.28)" }}
            />

            {/* the bet reminder stands over the track until the player starts the race */}
            {preRace}

            {/* the moment the field is home, the track hands over to the result */}
            {done && (
              <RaceResultsOverlay
                horses={horses}
                winnerId={winnerId}
                bet={bet}
                raceDate={raceDate}
                onReplay={onReplay}
              />
            )}
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