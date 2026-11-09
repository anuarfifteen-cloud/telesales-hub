/**
 * Daily Derby artwork.
 *
 * The racers are a hand-drawn 2.5D cartoon sprite sheet: four gallop frames on a
 * transparent sheet, each frame bottom-aligned in its square cell so the hooves
 * always land exactly on the lane's feet line.
 */
export const RACER_SHEET =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/c131fcf07_derby-racer-sheet-v2.png";
export const RACER_FRAMES = 4;

export const DUST_PUFF =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/e37e49f9a_derby-dust.png";

/**
 * Saddlecloth anchor, as a percentage of one sprite cell.
 *
 * The back line sits at ~52.5% of the cell in three of the four gallop frames but
 * drops to ~56% in the fourth, so each frame carries its own offset. The number
 * patch rides that offset and stays glued to the flank instead of floating as the
 * horse bobs through the stride.
 */
export const SADDLE = { left: 31, width: 17, top: 54.4, height: 13.5 };
export const SADDLE_FRAME_OFFSET = [0.4, 0, 0.4, 4.1];

/* One drawn coat serves every runner; each lane recolours it to its own silks.
   Golden Spur (h5) is pushed all the way to yellow. */
const TINTS = {
  h1: "saturate(1.25)",
  h2: "saturate(0.14) brightness(1.16)",
  h3: "saturate(1.45) hue-rotate(-30deg)",
  h4: "hue-rotate(214deg) saturate(1.1)",
  h5: "sepia(1) saturate(4.6) hue-rotate(6deg) brightness(1.16)",
  h6: "hue-rotate(135deg) saturate(1.15)",
};

export function racerTint(horseId) {
  return TINTS[horseId] || "none";
}