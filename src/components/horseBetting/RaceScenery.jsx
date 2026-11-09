/**
 * The illustrated racecourse behind the runners: tiered grandstand packed with
 * a cartoon crowd, white rail, layered grass bank and the dirt straight.
 *
 * Every layer pans at its own speed from the single `cameraX` value, so the
 * scene stays in step with the horses while the background reads as depth.
 */
import { memo } from "react";

export const SCENE_H = 232;
export const DIRT_TOP = 114;

const SKIN = ["#f2cba4", "#e3ac81", "#c9885c", "#90603f", "#f7dcc1"];
const SHIRT = [
  "#e2725b",
  "#f0a33c",
  "#3f7cc4",
  "#5ab27c",
  "#a763c9",
  "#e2c04b",
  "#d95f8c",
  "#4aa3b8",
  "#7d8fa8",
];

const TIERS = [
  { bandTop: 0, bandH: 30, figH: 13, count: 44, tone: "#d3dbe6" },
  { bandTop: 26, bandH: 28, figH: 15, count: 38, tone: "#c6d0dc" },
  { bandTop: 50, bandH: 28, figH: 18, count: 32, tone: "#b8c4d3" },
];

function buildCrowd() {
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const out = [];
  TIERS.forEach((tier, ti) => {
    const step = 100 / tier.count;
    for (let i = 0; i < tier.count; i++) {
      const shirt = SHIRT[Math.floor(rnd() * SHIRT.length)];
      const skin = SKIN[Math.floor(rnd() * SKIN.length)];
      if (rnd() < 0.1) continue; // gaps in the crowd
      out.push({
        id: `${ti}-${i}`,
        left: (i + 0.5) * step + (rnd() - 0.5) * step * 0.45,
        top: tier.bandTop + tier.bandH - tier.figH - Math.round(rnd() * 3),
        h: tier.figH,
        shirt,
        skin,
      });
    }
  });
  return out;
}

const CROWD = buildCrowd();

/* The crowd never changes, so it is kept out of the per-frame camera updates. */
const CrowdFigures = memo(function CrowdFigures() {
  return CROWD.map((f) => (
    <span key={f.id} className="absolute" style={{ left: `${f.left}%`, top: f.top, width: f.h * 0.9, height: f.h }}>
      <span
        className="absolute left-1/2 rounded-full"
        style={{
          top: 0,
          width: f.h * 0.42,
          height: f.h * 0.42,
          marginLeft: -f.h * 0.21,
          background: f.skin,
        }}
      />
      <span
        className="absolute bottom-0 left-0 w-full"
        style={{ height: f.h * 0.62, background: f.shirt, borderRadius: "40% 40% 12% 12%" }}
      />
    </span>
  ));
});

export default function RaceScenery({ cameraX = 0 }) {
  return (
    <>
      {/* sky + far stand backdrop */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: 80, background: "linear-gradient(180deg,#e8eef6 0%,#d6e0ec 100%)" }}
      />

      {/* grandstand tiers */}
      {TIERS.map((tier, i) => (
        <div
          key={`tier-${i}`}
          className="absolute inset-x-0"
          style={{
            top: tier.bandTop,
            height: tier.bandH,
            background: `linear-gradient(180deg, ${tier.tone} 0%, rgba(255,255,255,0.55) 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -2px 3px rgba(60,80,110,0.16)",
          }}
        />
      ))}

      {/* the crowd, doubled in width so it can pan without gaps */}
      <div
        className="absolute top-0"
        style={{ left: 0, width: "200%", height: 80, transform: `translate3d(${-cameraX * 0.09}px,0,0)` }}
      >
        <CrowdFigures />
      </div>

      {/* soft depth wash over the stands */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: 80, background: "linear-gradient(180deg, rgba(24,40,60,0.16) 0%, rgba(24,40,60,0) 55%, rgba(24,40,60,0.10) 100%)" }}
      />

      {/* white rail */}
      <div className="absolute inset-x-0" style={{ top: 76, height: 17 }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: 7, background: "linear-gradient(180deg,#ffffff 0%,#e7ecf2 100%)", boxShadow: "0 2px 3px rgba(40,60,40,0.25)" }}
        />
        <div
          className="absolute inset-x-0 top-[9px]"
          style={{
            height: 7,
            backgroundImage: `repeating-linear-gradient(90deg,#ffffff 0 4px, #dfe6ee 4px 5px, transparent 5px 21px)`,
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