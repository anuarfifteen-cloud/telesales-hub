import { memo } from "react";
import { RACER_FRAMES, RACER_SHEET, SADDLE, SADDLE_FRAME_OFFSET, racerTint } from "@/lib/derbyArt";

/**
 * One hand-drawn racer, stepped through the four gallop frames of the sprite
 * sheet. The frames sit in equal cells on the sheet, so a frame is selected by
 * sliding the background position — no image swapping while the race runs.
 *
 * Each runner also wears its lane number on a saddlecloth patch pinned to the
 * horse's back, so the field is readable at a glance while they gallop.
 */
const RacerSprite = memo(function RacerSprite({
  horseId,
  number,
  size = 60,
  frame = 0,
  glow = false,
  blurred = false,
}) {
  const step = ((frame % RACER_FRAMES) + RACER_FRAMES) % RACER_FRAMES;
  const saddleTop = SADDLE.top + (SADDLE_FRAME_OFFSET[step] || 0);

  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 block"
        style={{
          backgroundImage: `url(${RACER_SHEET})`,
          backgroundSize: `${RACER_FRAMES * 100}% 100%`,
          backgroundPosition: `${(step * 100) / (RACER_FRAMES - 1)}% 0`,
          backgroundRepeat: "no-repeat",
          filter: [
            racerTint(horseId),
            glow ? "drop-shadow(0 0 7px rgba(255,214,90,0.95))" : "",
            blurred ? "blur(0.4px)" : "",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      />

      {number ? (
        <span
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            left: `${SADDLE.left}%`,
            top: `${saddleTop}%`,
            width: `${SADDLE.width}%`,
            height: `${SADDLE.height}%`,
            borderRadius: size * 0.04,
            background: "linear-gradient(158deg,#14503a 0%,#0b3225 70%,#082619 100%)",
            border: `${Math.max(1, size * 0.018)}px solid rgba(214,178,72,0.95)`,
            color: "#fdf4d8",
            fontWeight: 900,
            fontSize: size * 0.1,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
            textShadow: "0 1px 1px rgba(0,0,0,0.45)",
          }}
        >
          {number}
        </span>
      ) : null}
    </>
  );
});

export default RacerSprite;