/**
 * One lane's horse, cropped out of the single 2 × 3 pixel-art sprite sheet and
 * rendered exactly as generated (never redrawn or recoloured). Lane 1-6 reads
 * left → right, top → bottom. Used by both the betting cards and the race
 * track, so every horse looks identical everywhere.
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

export default function HorseSprite({ number = 1, width = 42, className = "" }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] ${className}`}
      style={{ width, height: width / 1.5 }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${SHEET})`,
          backgroundSize: "200% 300%",
          backgroundPosition: CELL_POSITION[number] || CELL_POSITION[1],
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          transform: "scale(1.18)",
        }}
      />
    </span>
  );
}