/**
 * Lane horse used on the betting cards.
 *
 * The six runners come from a single 2 × 3 pixel-art sprite sheet, cropped here
 * per lane (1-6 reads left → right, top → bottom) rather than regenerated. The
 * sheet is displayed as-is; `mix-blend-multiply` melts its cream backdrop into
 * the card so only the horse and jockey show. The lane number rides in a small
 * dark badge so the runner stays identifiable at a glance. Odds are never shown —
 * every horse has an equal chance of winning.
 */
const SHEET =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/24c3088b3_generated_e4431a9f.png";

// Cell centres inside the 2-col × 3-row sheet: 0% / 100% across, 0% / 50% / 100% down.
const CELL_POSITION = {
  1: "0% 0%",
  2: "100% 0%",
  3: "0% 50%",
  4: "100% 50%",
  5: "0% 100%",
  6: "100% 100%",
};

export default function HorseSilhouette({ number = 1, size = 42 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size / 1.5 }}
    >
      <span
        aria-hidden="true"
        className="h-full w-full mix-blend-multiply"
        style={{
          backgroundImage: `url(${SHEET})`,
          backgroundSize: "200% 300%",
          backgroundPosition: CELL_POSITION[number] || CELL_POSITION[1],
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
      <span
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-slate-900 text-[9px] font-black leading-none text-white ring-2 ring-white"
        style={{ width: 14, height: 14 }}
      >
        {number}
      </span>
    </span>
  );
}