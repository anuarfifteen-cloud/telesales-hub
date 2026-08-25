import { AnimatePresence } from "framer-motion";
import Candy from "./Candy";
import { BOARD_W, BOARD_H } from "./constants";

// Board owns the candy-layer container. AnimatePresence plays each cleared
// tile's fade+shrink exit in parallel; surviving tiles slide via Framer Motion
// `layout`. No shake state, no per-piece exit flags.
export default function Board({ pieces, selected, onCellClick, phase, busy }) {
  const disabled = phase !== "playing" || busy;

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-slate-300/50 dark:bg-slate-800/95 dark:border-slate-700/80 dark:shadow-purple-900/20 p-2"
      style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}
    >
      <div className="relative" style={{ width: BOARD_W, height: BOARD_H }}>
        <AnimatePresence>
          {pieces.map(({ piece, r, c }) => (
            <Candy
              key={piece.id}
              piece={piece}
              r={r}
              c={c}
              selected={selected && selected.r === r && selected.c === c}
              onPointerDown={() => onCellClick(r, c)}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}