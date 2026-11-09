/**
 * The racecourse behind the runners — a Luxury Turf Club trackside.
 *
 * A bright daylight sky with drifting clouds sits above a run of gold-framed
 * sponsor boards carrying the app's branding, clipped on a hedge with the turf
 * edge below and the dirt straight in front. Every layer pans at its own speed
 * from the single `cameraX` value, so the background keeps step with the horses.
 */
import { TRACKSIDE, TRACKSIDE_RATIO } from "@/lib/derbyArt";

export const SCENE_H = 300;
export const DIRT_TOP = 114;

const SKY_H = 46;
const BAND_TOP = 46;
const BAND_H = 114 - 46;

/* The backdrop is drawn at its own scale and windowed onto the board strip. */
const SHEET_H = 358;
const SHEET_W = Math.round(SHEET_H * TRACKSIDE_RATIO);
const CROP_Y = Math.round(SHEET_H * 0.6);

const PAN = 0.1;
const TILE_W = 132;
const TILE_COUNT = 8;

const CLOUDS_FAR =
  "radial-gradient(40px 13px at 32px 26px, rgba(255,255,255,0.92) 0 58%, rgba(255,255,255,0) 72%)," +
  "radial-gradient(26px 9px at 74px 20px, rgba(255,255,255,0.78) 0 58%, rgba(255,255,255,0) 72%)," +
  "radial-gradient(48px 15px at 158px 32px, rgba(255,255,255,0.85) 0 58%, rgba(255,255,255,0) 72%)";

const CLOUDS_NEAR =
  "radial-gradient(58px 18px at 60px 34px, rgba(255,255,255,0.95) 0 56%, rgba(255,255,255,0) 70%)," +
  "radial-gradient(34px 12px at 120px 26px, rgba(255,255,255,0.8) 0 56%, rgba(255,255,255,0) 70%)," +
  "radial-gradient(66px 20px at 236px 38px, rgba(255,255,255,0.9) 0 56%, rgba(255,255,255,0) 70%)";

export default function RaceScenery({ cameraX = 0 }) {
  const pan = cameraX * PAN;

  return (
    <>
      {/* daylight sky */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{
          height: SKY_H,
          background: "linear-gradient(180deg,#4aa2e6 0%,#7cc1ee 54%,#d3ebf8 100%)",
        }}
      >
        <div
          className="absolute -right-7 -top-9 h-24 w-24 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,247,214,0.95) 0%, rgba(255,247,214,0.35) 42%, rgba(255,247,214,0) 72%)",
          }}
        />
        {/* clouds — the far bank drifts slower than the near one */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: CLOUDS_FAR,
            backgroundSize: "210px 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${-pan * 0.5}px 0`,
            opacity: 0.9,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: CLOUDS_NEAR,
            backgroundSize: "300px 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: `${-pan * 1.15}px 0`,
          }}
        />
      </div>

      {/* sponsor boards, hedge and turf edge */}
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: BAND_TOP, height: BAND_H }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${TRACKSIDE})`,
            backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
            backgroundPosition: `${-pan}px ${-CROP_Y}px`,
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* the app's own boards along the top of the run */}
        <div className="absolute inset-x-0 overflow-hidden" style={{ top: 8, height: 28 }}>
          {Array.from({ length: TILE_COUNT }).map((_, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center gap-1"
              style={{
                left: i * TILE_W - (pan % TILE_W),
                top: 0,
                width: TILE_W - 9,
                height: "100%",
                borderRadius: 3,
                background: "linear-gradient(155deg,#12452f 0%,#0b3021 70%,#08251a 100%)",
                border: "1px solid rgba(212,175,55,0.8)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.28)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Pacifico', cursive",
                  fontSize: 10,
                  lineHeight: 1,
                  color: "#e9d194",
                  whiteSpace: "nowrap",
                }}
              >
                Telesales Hub
              </span>
            </div>
          ))}
        </div>

        {/* the boards catch a little sun along their top edge */}
        <div
          className="absolute inset-x-0"
          style={{
            top: 8,
            height: 3,
            background: "linear-gradient(180deg, rgba(255,241,199,0.35), rgba(255,241,199,0))",
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