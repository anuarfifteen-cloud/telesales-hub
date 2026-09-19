import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Candy from "./Candy";
import { BOARD_W, BOARD_H, CELL, GAP } from "./constants";

// Board owns the candy-layer container. AnimatePresence plays each cleared
// tile's fade+shrink exit; surviving tiles slide via Framer Motion `layout`.
// A per-piece squash signal is bumped whenever a tile's row increases (a fall),
// so Candy can play a one-shot landing squash. The signal only ever increases,
// so in-flight squashes are never cancelled by the refill/next render.
export default function Board({ pieces, selected, onCellClick, phase, busy, blastFlash }) {
  const disabled = phase !== "playing" || busy;
  const prevRowsRef = useRef(new Map());
  const [squashMap, setSquashMap] = useState(new Map());

  // After each render: diff rows to detect falls, bump that piece's squash
  // signal (carrying the fall distance), then snapshot rows for next diff.
  useEffect(() => {
    const prev = prevRowsRef.current;
    let anyFall = false;
    const next = new Map(squashMap);
    const newPrev = new Map();
    for (const { piece, r } of pieces) {
      newPrev.set(piece.id, r);
      const p = prev.get(piece.id);
      if (p != null && r > p) {
        anyFall = true;
        const cur = next.get(piece.id);
        next.set(piece.id, { signal: (cur?.signal ?? 0) + 1, fallRows: r - p });
      }
    }
    prevRowsRef.current = newPrev;
    if (anyFall) setSquashMap(next);
  });

  return (
    <div
      className="ds-board relative isolate overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-slate-300/50 dark:bg-slate-800/95 dark:border-slate-700/80 dark:shadow-purple-900/20 p-2"
      style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}
    >
      <div className="relative" style={{ width: BOARD_W, height: BOARD_H }}>
        <AnimatePresence>
          {pieces.map(({ piece, r, c }) => {
            const prevR = prevRowsRef.current.get(piece.id);
            const fallRows = prevR != null ? Math.max(0, r - prevR) : 0;
            const sig = squashMap.get(piece.id);
            return (
              <Candy
                key={piece.id}
                piece={piece}
                r={r}
                c={c}
                fallRows={fallRows}
                squashSignal={sig?.signal ?? 0}
                squashFallRows={sig?.fallRows ?? 0}
                selected={selected && selected.r === r && selected.c === c}
                onPointerDown={() => onCellClick(r, c)}
                disabled={disabled}
              />
            );
          })}
        </AnimatePresence>
        {blastFlash?.cells?.map((cell, i) => (
          <div
            key={`blast-${blastFlash.key}-${i}`}
            className="ds-blast-flash"
            style={{ left: cell.c * (CELL + GAP), top: cell.r * (CELL + GAP), width: CELL, height: CELL }}
          />
        ))}
      </div>
    </div>
  );
}