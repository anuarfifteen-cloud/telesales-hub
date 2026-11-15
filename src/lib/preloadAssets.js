import { CLOSER_BG } from "@/lib/closerTheme";

/**
 * Arcade artwork that must be in the browser cache before the Tokens tab opens.
 * The Dealbreaker banner is the only photographic asset on that tab — every other
 * tile is a gradient — so it is warmed up as soon as the app shell mounts.
 */
const ARCADE_ART = [CLOSER_BG];

let started = false;

export function preloadArcadeArt() {
  if (started || typeof window === "undefined") return;
  started = true;
  ARCADE_ART.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}