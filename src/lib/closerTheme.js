/** The Closer — static artwork and desk palette. */

/** The illustrated office used as the game's base layer. */
export const CLOSER_BG =
  "https://base44.app/api/apps/6a02849f1b6bb0b71bf23993/files/mp/public/6a02849f1b6bb0b71bf23993/e119566c7_closer-office-bg.jpg";

/**
 * Black-and-yellow chip shown beside every prize amount on the sideboards.
 * Paste your own chip image URL here to replace the built-in drawing, e.g.
 * CHIP_ICON_URL = "https://your-host/chip.png";
 */
export const CHIP_ICON_URL = "";

/** The Manager's dedicated portrait. */
const MANAGER_PORTRAIT_URL =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/190780bd4_generated_aec441fb.png";

/**
 * Tighter face crop inside the circular frame: the portrait is scaled up so the
 * frame holds his face from hairline to chin, centred across and down.
 */
export const MANAGER_PORTRAIT = {
  backgroundImage: `url(${MANAGER_PORTRAIT_URL})`,
  backgroundSize: "175% auto",
  backgroundPosition: "50% 40%",
  backgroundRepeat: "no-repeat",
};

/** Folder 1-10 colours: body gradient start, edge/shadow tone. */
export const FOLDER_COLORS = [
  { body: "#8B5CF6", edge: "#6D28D9" },
  { body: "#F59E0B", edge: "#B45309" },
  { body: "#9CA3AF", edge: "#6B7280" },
  { body: "#84CC16", edge: "#4D7C0F" },
  { body: "#06B6D4", edge: "#0E7490" },
  { body: "#EC4899", edge: "#BE185D" },
  { body: "#3B82F6", edge: "#1D4ED8" },
  { body: "#14B8A6", edge: "#0F766E" },
  { body: "#A855F7", edge: "#7E22CE" },
  { body: "#EF4444", edge: "#B91C1C" },
];