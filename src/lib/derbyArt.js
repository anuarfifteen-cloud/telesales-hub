/**
 * Daily Derby artwork.
 *
 * The racers are a hand-drawn 2.5D cartoon sprite sheet: four gallop frames on a
 * transparent sheet, each frame bottom-aligned in its square cell so the hooves
 * always land exactly on the lane's feet line. The dust puff and the trackside
 * backdrop (sponsored boards, hedge and turf) are cut from the same set.
 */
export const RACER_SHEET =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/c131fcf07_derby-racer-sheet-v2.png";
export const RACER_FRAMES = 4;

export const DUST_PUFF =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/e37e49f9a_derby-dust.png";

/* Luxury Turf Club backdrop: gold-framed sponsor boards on a clipped hedge,
   with the turf edge beneath. Used as-is, cropped to its board strip. */
export const TRACKSIDE =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/564ae471b_generated_db2d7e8f.png";
export const TRACKSIDE_RATIO = 2752 / 1536;

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