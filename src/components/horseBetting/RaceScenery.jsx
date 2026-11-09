/**
 * The illustrated racecourse behind the runners: hand-drawn grandstand packed
 * with a cheering cartoon crowd, white rail, layered grass bank and dirt
 * straight.
 *
 * Every layer pans at its own speed from the single `cameraX` value, so the
 * scene stays in step with the horses while the background reads as depth.
 */
import { GRANDSTAND } from "@/lib/derbyArt";

export const SCENE_H = 300;
export const DIRT_TOP = 114;

const STAND_H = 80;

export default function RaceScenery({ cameraX = 0 }) {
  return (
    <>
      {/* sky behind the stands */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: STAND_H, background: "linear-gradient(180deg,#e8eef6 0%,#d6e0ec 100%)" }}
      />

      {/* the stands themselves — one wide illustrated crowd, slowly panning */}
      <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: STAND_H }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${GRANDSTAND})`,
            backgroundSize: "130% auto",
            backgroundPosition: `${-cameraX * 0.09}px 44%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      {/* soft depth wash over the stands */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: STAND_H,
          background:
            "linear-gradient(180deg, rgba(24,40,60,0.22) 0%, rgba(24,40,60,0) 52%, rgba(24,40,60,0.14) 100%)",
        }}
      />

      {/* white rail */}
      <div className="absolute inset-x-0" style={{ top: 76, height: 17 }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: 7,
            background: "linear-gradient(180deg,#ffffff 0%,#e7ecf2 100%)",
            boxShadow: "0 2px 3px rgba(40,60,40,0.25)",
          }}
        />
        <div
          className="absolute inset-x-0 top-[9px]"
          style={{
            height: 7,
            backgroundImage:
              "repeating-linear-gradient(90deg,#ffffff 0 4px, #dfe6ee 4px 5px, transparent 5px 21px)",
            backgroundPositionX: `${-cameraX * 0.5}px`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 6, background: "linear-gradient(180deg,rgba(46,80,50,0.35), rgba(46,80,50,0))" }}
        />
      </div>

      {/* grass bank */}
      <div
        className="absolute inset-x-0"
        style={{ top: 92, height: 24, background: "linear-gradient(180deg,#8ed08a 0%,#69b56d 55%,#4f9a58 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 5px 4px, rgba(22,80,36,0.30) 0 1.6px, transparent 2px)",
            backgroundSize: "15px 11px",
            backgroundPosition: `${-cameraX * 1.15}px 3px`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 3px 2px, rgba(255,255,255,0.45) 0 1.2px, transparent 1.6px)",
            backgroundSize: "23px 9px",
            backgroundPosition: `${-cameraX * 1.35}px 0px`,
          }}
        />
      </div>

      {/* dirt straight */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: DIRT_TOP, background: "linear-gradient(180deg,#c99663 0%,#bd8451 38%,#a86f41 100%)" }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: 5, background: "linear-gradient(180deg,rgba(120,70,32,0.42), rgba(120,70,32,0))" }}
        />
        {/* long horizontal layers of the track */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(96,58,26,0.10) 0 1.5px, transparent 1.5px 19px)",
          }}
        />
        {/* pebbles and dust specks scrolling with the camera */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(92,54,22,0.30) 0 1.3px, transparent 1.7px)",
            backgroundSize: "23px 14px",
            backgroundPosition: `${-cameraX * 1.12}px 7px`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,231,199,0.55) 0 1.1px, transparent 1.5px)",
            backgroundSize: "37px 18px",
            backgroundPosition: `${-cameraX * 1.45}px 13px`,
          }}
        />
        {/* motion streaks */}
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,244,225,0.4) 0 30px, transparent 30px 96px)",
            backgroundPositionX: `${-cameraX * 1.38}px`,
          }}
        />
      </div>
    </>
  );
}