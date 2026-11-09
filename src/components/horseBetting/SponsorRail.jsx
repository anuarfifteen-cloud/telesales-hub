/**
 * The straight trackside rail with Brunei's sponsor boards mounted flush on it.
 *
 * The three boards repeat endlessly along the level rail and slide with the
 * camera, so the run reads as one continuous sponsor line — never a curve or an
 * angled stand. The boards sit on the very top edge of the race window.
 */
const BOARDS = [
  { label: "DST", bg: "linear-gradient(170deg,#813a96 0%,#6a287e 55%,#541f66 100%)" },
  { label: "UNN", bg: "linear-gradient(170deg,#d63b34 0%,#c62828 55%,#a01d1d 100%)" },
  { label: "16888", bg: "linear-gradient(170deg,#2b3699 0%,#1a237e 55%,#121a63 100%)", silver: true },
];

export const TILE_W = 108;
const GAP = 9;
const STEP = TILE_W + GAP;
export const BOARD_H = 46;
export const RAIL_H = 12;

export default function SponsorRail({ cameraX = 0 }) {
  const pan = cameraX * 0.18;
  const shift = pan % STEP;
  const count = 11;

  return (
    <div className="absolute inset-x-0" style={{ top: 0 }}>
      {/* boards — the race window is cropped to their top edge */}
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: 0, height: BOARD_H }}>
        {Array.from({ length: count }).map((_, i) => {
          const board = BOARDS[i % BOARDS.length];
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center"
              style={{
                left: i * STEP - shift - STEP,
                top: 0,
                width: TILE_W,
                height: BOARD_H,
                background: board.bg,
                border: board.silver ? "2px solid #cfd8dc" : "1px solid rgba(255,255,255,0.22)",
                borderRadius: 4,
                boxShadow: board.silver
                  ? "inset 0 0 0 3px rgba(255,255,255,0.22), inset 0 0 14px rgba(207,216,220,0.35), 0 3px 6px rgba(0,0,0,0.22)"
                  : "inset 0 1px 0 rgba(255,255,255,0.22), 0 3px 6px rgba(0,0,0,0.22)",
              }}
            >
              {board.silver && (
                <span
                  className="pointer-events-none absolute"
                  style={{
                    inset: 5,
                    border: "1.5px solid rgba(207,216,220,0.75)",
                    borderRadius: 3,
                  }}
                />
              )}
              <span
                style={{
                  position: "relative",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: board.label.length > 3 ? 22 : 26,
                  letterSpacing: board.label.length > 3 ? "0.06em" : "0.12em",
                  lineHeight: 1,
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}
              >
                {board.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* the rail the boards stand on — dead level across the top of the dirt */}
      <div
        className="absolute inset-x-0"
        style={{
          top: BOARD_H,
          height: RAIL_H,
          background: "linear-gradient(180deg,#ffffff 0%,#f4f7f8 55%,#dfe4e7 100%)",
          boxShadow: "0 -1px 0 rgba(255,255,255,0.9), 0 3px 6px rgba(0,0,0,0.28)",
        }}
      />

      {/* solid posts, evenly spaced and driven down into the top dirt line so the
          rail reads as firmly anchored instead of floating */}
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: BOARD_H + RAIL_H - 4, height: 18 }}>
        {Array.from({ length: count + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: i * STEP + TILE_W / 2 - shift,
              top: 0,
              width: 8,
              height: "100%",
              borderRadius: 1,
              background: "linear-gradient(90deg,#cfd6da 0%,#ffffff 45%,#dbe2e5 100%)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.28)",
            }}
          />
        ))}
      </div>
    </div>
  );
}