import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Candy from "./Candy";
import { BOARD_W, BOARD_H } from "./constants";

// Board owns the candy-layer container. On a special match it toggles the
// `.match-shake` CSS class on the candy layer for 300ms (reuses the
// @keyframes match-shake already defined in src/index.css). No Framer Motion
// controls — one cheap CSS animation, no per-frame JS.
export default function Board({ pieces, selected, onCellClick, phase, busy, matchedIds, explosionIds, shakeTrigger }) {
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef(null);

  useEffect(() => {
    if (shakeTrigger === 0) return;
    setShaking(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), 300);
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, [shakeTrigger]);

  const disabled = phase !== "playing" || busy;

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-slate-300/50 dark:bg-slate-800/95 dark:border-slate-700/80 dark:shadow-purple-900/20 p-2"
      style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}
    >
      <div
        className={`relative ${shaking ? "match-shake" : ""}`}
        style={{ width: BOARD_W, height: BOARD_H }}
      >
        <AnimatePresence>
          {pieces.map(({ piece, r, c }) => (
            <Candy
              key={piece.id}
              piece={piece}
              r={r}
              c={c}
              selected={selected && selected.r === r && selected.c === c}
              onPointerDown={() => onCellClick(r, c)}
              isMatched={matchedIds.has(piece.id)}
              isExplosion={explosionIds.has(piece.id)}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}