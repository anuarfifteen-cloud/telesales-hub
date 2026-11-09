/**
 * The racecourse behind the runners, cropped tight to the action: the view starts
 * at the very top of the sponsor adboards — no sky — then the level rail, the turf
 * strip it is planted in, and the dirt straight the runners gallop over.
 * Every layer is a straight horizontal band that pans at its own speed from the
 * single `cameraX` value.
 */
import SponsorRail, { BOARD_H, RAIL_H } from "./SponsorRail";

export { BOARD_H };
export const SCENE_H = 340;
export const DIRT_TOP = 70;
const RAIL_BOTTOM = BOARD_H + RAIL_H;

export default function RaceScenery({ cameraX = 0 }) {
  return (
    <>
      {/* the turf the rail is planted in, right down to the dirt */}
      <div
        className="absolute inset-x-0"
        style={{
          top: RAIL_BOTTOM - 2,
          height: DIRT_TOP - RAIL_BOTTOM + 4,
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
            height: 8,
            background: "linear-gradient(180deg,rgba(104,60,28,0.5), rgba(104,60,28,0))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(96,58,26,0.10) 0 2px, transparent 2px 26px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(92,54,22,0.30) 0 1.8px, transparent 2.3px)",
            backgroundSize: "31px 19px",
            backgroundPosition: `${-cameraX * 1.12}px 9px`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,231,199,0.55) 0 1.5px, transparent 2px)",
            backgroundSize: "50px 24px",
            backgroundPosition: `${-cameraX * 1.45}px 17px`,
          }}
        />
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,244,225,0.4) 0 40px, transparent 40px 128px)",
            backgroundPositionX: `${-cameraX * 1.38}px`,
          }}
        />
      </div>
    </>
  );
}