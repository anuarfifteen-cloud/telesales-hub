/**
 * The racecourse behind the runners: a flat Brunei daylight sky, the level
 * sponsor rail with its repeating boards, and the dirt straight in front.
 * Nothing here is angled or curved — every layer is a straight horizontal band
 * that pans at its own speed from the single `cameraX` value.
 */
import DerbySky from "./DerbySky";
import SponsorRail from "./SponsorRail";

export const SCENE_H = 300;
export const DIRT_TOP = 96;

export default function RaceScenery({ cameraX = 0 }) {
  return (
    <>
      <DerbySky cameraX={cameraX} height={46} />
      {/* the turf the rail is planted in, right down to the dirt */}
      <div
        className="absolute inset-x-0"
        style={{
          top: 86,
          height: DIRT_TOP - 86 + 2,
          background: "linear-gradient(180deg,#16452f 0%,#0e3122 62%,#0a2418 100%)",
        }}
      />

      <SponsorRail cameraX={cameraX} />

      {/* dirt straight */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: DIRT_TOP, background: "linear-gradient(180deg,#cd9966 0%,#bf8753 38%,#a86f41 100%)" }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: 6,
            background: "linear-gradient(180deg,rgba(104,60,28,0.5), rgba(104,60,28,0))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(96,58,26,0.10) 0 1.5px, transparent 1.5px 19px)",
          }}
        />
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