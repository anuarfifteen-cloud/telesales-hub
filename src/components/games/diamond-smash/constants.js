// Fixed cell geometry for the Diamond Smash grid (CSS layout, not grid-auto)
export const CELL = 40;
export const GAP = 4;
export const ROWS = 8;
export const COLS = 8;
export const BOARD_W = COLS * CELL + (COLS - 1) * GAP; // 348
export const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP; // 348
// Shared cohesive panel width — matches the board wrapper (BOARD_W + 16).
// Used by the stat bar, audio row, booster HUD, shop and leaderboard so the
// whole vertical stack reads as one aligned panel, not mismatched widths.
export const PANEL_W = BOARD_W + 16; // 364
export const MAX_MOVES = 20;
export const GAME_TIME = 90;