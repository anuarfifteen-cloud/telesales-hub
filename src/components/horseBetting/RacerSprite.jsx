import { memo } from "react";
import { RACER_FRAMES, RACER_SHEET, racerTint } from "@/lib/derbyArt";

/**
 * One hand-drawn racer, stepped through the four gallop frames of the sprite
 * sheet. The frames sit in equal cells on the sheet, so a frame is selected by
 * sliding the background position — no image swapping while the race runs.
 */
const RacerSprite = memo(function RacerSprite({ horseId, frame = 0, glow = false, blurred = false }) {
  const step = ((frame % RACER_FRAMES) + RACER_FRAMES) % RACER_FRAMES;

  return (
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
  );
});

export default RacerSprite;