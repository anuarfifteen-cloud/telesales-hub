/**
 * Daily Derby artwork.
 *
 * The racers are a hand-drawn 2.5D cartoon sprite sheet: four gallop frames on a
 * transparent sheet, each frame bottom-aligned in its square cell so the hooves
 * always land exactly on the lane's feet line. The dust puff and the grandstand
 * are cut from the same illustrated set.
 */
export const RACER_SHEET =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/4c13dc350_derby-racer-sheet.png";
export const RACER_FRAMES = 4;

export const DUST_PUFF =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/e37e49f9a_derby-dust.png";

export const GRANDSTAND =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/116370387_generated_image.png";

/* One drawn coat serves every runner; each lane recolours it to its own silks. */
const TINTS = {
  h1: "saturate(1.25)",
  h2: "saturate(0.14) brightness(1.16)",
  h3: "saturate(1.45) hue-rotate(-30deg)",
  h4: "hue-rotate(214deg) saturate(1.1)",
  h5: "hue-rotate(24deg) saturate(1.35) brightness(1.09)",
  h6: "hue-rotate(135deg) saturate(1.15)",
};

export function racerTint(horseId) {
  return TINTS[horseId] || "none";
}