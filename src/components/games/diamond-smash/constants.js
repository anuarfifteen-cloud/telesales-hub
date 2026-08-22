// Fixed cell geometry for the Diamond Smash grid (CSS layout, not grid-auto)
export const CELL = 40;
export const GAP = 4;
export const ROWS = 8;
export const COLS = 8;
export const BOARD_W = COLS * CELL + (COLS - 1) * GAP; // 348
export const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP; // 348
export const MAX_MOVES = 20;
export const GAME_TIME = 90;