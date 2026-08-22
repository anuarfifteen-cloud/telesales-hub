import { useCallback } from "react";

// ── Pure match-3 board engine for Diamond Smash ─────────────────────────────
// Geometry mirrors DiamondSmash — kept here (and imported by Board via constants
// passed in) so the engine stays pure/data-only and reusable.

export const ROWS = 8;
export const COLS = 8;
export const EMOJIS = ["🍬", "🍭", "🍫", "🍩", "💎"];
export const POINTS = [2, 2, 2, 2, 5];

let _id = 0;
export const makePiece = (type) => ({ id: ++_id, type });
export const randType = () => Math.floor(Math.random() * EMOJIS.length);

// Build a board guaranteed free of starting matches (best-effort, bounded)
export function newPieceBoard() {
  let board;
  let guard = 0;
  do {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push(makePiece(randType()));
      board.push(row);
    }
    guard++;
  } while (findPieceMatches(board).length > 0 && guard < 200);
  return board;
}

// Any 3+ alignment (used only to reject swaps / seed a clean board)
export function findPieceMatches(board) {
  const matched = new Set();
  const key = (r, c) => `${r},${c}`;
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && board[r][c] && board[r][c - 1] && board[r][c].type === board[r][c - 1].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(key(r, c - 1 - k));
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && board[r][c] && board[r - 1][c] && board[r][c].type === board[r - 1][c].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(key(r - 1 - k, c));
        run = 1;
      }
    }
  }
  return Array.from(matched).map((s) => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });
}

// Detect connected match clusters and classify each cluster's shape.
// "five"  — 5+ in a line → color wipe (every same-emoji tile cleared)
// "tl"    — T- or L-shape → color wipe
// "h4"    — 4 in a row    → entire column at pivot cleared
// "v4"    — 4 in a column → entire row at pivot cleared
// "normal"— plain 3-match
export function findMatchClusters(board) {
  const hRuns = [];
  const vRuns = [];

  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      const prev = board[r][c - 1];
      const cur = c < COLS ? board[r][c] : null;
      const same = prev && cur && prev.type === cur.type;
      if (!same) {
        const len = c - start;
        if (len >= 3 && prev) {
          const cells = [];
          for (let k = start; k < c; k++) cells.push({ r, c: k });
          hRuns.push({ type: board[r][start].type, cells, orient: "h" });
        }
        start = c;
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      const prev = board[r - 1][c];
      const cur = r < ROWS ? board[r][c] : null;
      const same = prev && cur && prev.type === cur.type;
      if (!same) {
        const len = r - start;
        if (len >= 3 && prev) {
          const cells = [];
          for (let k = start; k < r; k++) cells.push({ r: k, c });
          vRuns.push({ type: board[start][c].type, cells, orient: "v" });
        }
        start = r;
      }
    }
  }

  const allRuns = [...hRuns, ...vRuns];
  if (allRuns.length === 0) return [];

  // Union-find: merge runs sharing a cell (T/L/+ intersections)
  const parent = allRuns.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const cellMap = new Map();
  allRuns.forEach((run, idx) => {
    for (const cell of run.cells) {
      const key = `${cell.r},${cell.c}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key).push(idx);
    }
  });
  for (const indices of cellMap.values()) {
    for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
  }

  const groups = new Map();
  allRuns.forEach((run, idx) => {
    const root = find(idx);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(run);
  });

  const clusters = [];
  for (const runs of groups.values()) {
    const type = runs[0].type;
    const cellSet = new Set();
    let maxH = 0, maxV = 0, hasH = false, hasV = false;
    for (const run of runs) {
      if (run.orient === "h") { hasH = true; maxH = Math.max(maxH, run.cells.length); }
      else { hasV = true; maxV = Math.max(maxV, run.cells.length); }
      for (const cell of run.cells) cellSet.add(`${cell.r},${cell.c}`);
    }
    const cells = Array.from(cellSet).map((s) => {
      const [r, c] = s.split(",").map(Number);
      return { r, c };
    });
    let shape = "normal";
    if (maxH >= 5 || maxV >= 5) shape = "five";
    else if (hasH && hasV) shape = "tl";
    else if (maxH === 4) shape = "h4";
    else if (maxV === 4) shape = "v4";
    clusters.push({ cells, type, shape });
  }
  return clusters;
}

// Remove cleared pieces (leaves gaps)
export function clearMatches(board, matched) {
  const next = board.map((row) => row.slice());
  matched.forEach(({ r, c }) => { next[r][c] = null; });
  return next;
}

// Drop surviving pieces to the bottom
export function applyGravity(board) {
  const next = board.map((row) => row.slice());
  for (let c = 0; c < COLS; c++) {
    const stack = [];
    for (let r = ROWS - 1; r >= 0; r--) if (next[r][c] !== null) stack.push(next[r][c]);
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = ROWS - 1 - r;
      next[r][c] = idx < stack.length ? stack[idx] : null;
    }
  }
  return next;
}

// Spawn new pieces into remaining gaps
export function refill(board) {
  const next = board.map((row) => row.slice());
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r][c] === null) next[r][c] = makePiece(randType());
    }
  }
  return next;
}

// Compute one cascade pass: returns the cleared cell set, the matched/explosion
// split (per piece.id), the special label, +1-move flag, hasSpecial, and the
// base step score for this pass. Pure — no React, no side effects.
export function computePass(working) {
  const clusters = findMatchClusters(working);
  if (clusters.length === 0) {
    return { clusters: [], allClear: [], isMatchedId: new Set(), isExplosionId: new Set(), specialLabel: null, isPower: false, hasSpecial: false, stepScore: 0 };
  }

  const clearKeys = new Set();
  let specialLabel = null;
  let isPower = false;

  for (const cl of clusters) {
    for (const cell of cl.cells) clearKeys.add(`${cell.r},${cell.c}`);

    if (cl.shape === "five" || cl.shape === "tl") {
      // 💣 COLOR WIPE — clear EVERY tile of the matched color on the board
      isPower = true;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (working[r][c]?.type === cl.type) clearKeys.add(`${r},${c}`);
        }
      }
      specialLabel = "💣 COLOR WIPE!";
    } else if (cl.shape === "h4") {
      // ↕️ COLUMN SMASH — clear entire vertical column at the pivot
      const pivot = cl.cells[Math.floor(cl.cells.length / 2)];
      for (let r = 0; r < ROWS; r++) clearKeys.add(`${r},${pivot.c}`);
      if (!specialLabel) specialLabel = "↕️ COLUMN SMASH!";
    } else if (cl.shape === "v4") {
      // ↔️ ROW SMASH — clear entire horizontal row at the pivot
      const pivot = cl.cells[Math.floor(cl.cells.length / 2)];
      for (let c = 0; c < COLS; c++) clearKeys.add(`${pivot.r},${c}`);
      if (!specialLabel) specialLabel = "↔️ ROW SMASH!";
    }
  }

  const allClear = Array.from(clearKeys).map((s) => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });

  // matchedCells = tiles directly in an aligned run; explosionCells = collateral
  const clusterCellKeys = new Set();
  for (const cl of clusters) for (const cell of cl.cells) clusterCellKeys.add(`${cell.r},${cell.c}`);

  const isMatchedId = new Set();
  const isExplosionId = new Set();
  let stepScore = 0;
  for (const m of allClear) {
    const piece = working[m.r][m.c];
    if (!piece) continue;
    stepScore += POINTS[piece.type] ?? 0;
    if (clusterCellKeys.has(`${m.r},${m.c}`)) isMatchedId.add(piece.id);
    else isExplosionId.add(piece.id);
  }

  // Special-match tiles — in-run tiles belonging to a 4+/T/L/five cluster get the spin
  const isSpecialMatchId = new Set();
  for (const cl of clusters) {
    if (cl.shape !== "normal") {
      for (const cell of cl.cells) {
        const piece = working[cell.r][cell.c];
        if (piece) isSpecialMatchId.add(piece.id);
      }
    }
  }

  return {
    clusters,
    allClear,
    isMatchedId,
    isExplosionId,
    isSpecialMatchId,
    specialLabel,
    isPower,
    hasSpecial: !!specialLabel,
    stepScore,
  };
}

// Test-swap a board for match validity; returns the swapped board (or null).
export function trySwap(board, a, b) {
  if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return null;
  const swapped = board.map((row) => row.slice());
  [swapped[a.r][a.c], swapped[b.r][b.c]] = [swapped[b.r][b.c], swapped[a.r][a.c]];
  if (findPieceMatches(swapped).length === 0) return null;
  return swapped;
}

// Flatten a board into renderable piece list (stable order: row-major)
export function flattenPieces(board) {
  const pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p) pieces.push({ piece: p, r, c });
    }
  }
  return pieces;
}

// Hook — exposes the engine helpers bound to a single board state setter.
export function useMatch3() {
  const init = useCallback(() => newPieceBoard(), []);
  return { init };
}