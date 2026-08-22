import { motion } from "framer-motion";
import { EMOJIS } from "@/hooks/useMatch3";
import { CELL, GAP } from "./constants";

// Destruction keyframes live in `exit` so AnimatePresence can play them on unmount.
// Matched (aligned 3/4/5 run tiles) → burst-squash pop
const MATCH_EXIT = { scale: [1, 1.5, 0], opacity: [1, 1, 0] };
// Special 4+/T/L/five in-run tiles → quick spin, then vanish
const SPECIAL_EXIT = { scale: [1, 1.2, 0], opacity: [1, 1, 0], rotate: [0, 360] };
// Explosion (4/5+ collateral tiles) → grow to 2×, quarter-turn then full flip, fade
const EXPLOSION_EXIT = { scale: [1, 2, 0], opacity: [1, 0.6, 0], rotate: [0, 90, 270] };

export default function Candy({ piece, r, c, selected, onPointerDown, isMatched, isExplosion, isSpecialMatch, disabled }) {
  const exitKind = isMatched ? "match" : isExplosion ? "explosion" : undefined;
  const exit = isMatched
    ? (isSpecialMatch ? SPECIAL_EXIT : MATCH_EXIT)
    : isExplosion ? EXPLOSION_EXIT : undefined;

  // Surviving pieces keep `layout` for the gravity slide (FLIP on transform).
  // Exiting pieces DROP layout so the FLIP correction can't override the spin/scale
  // exit keyframes — both write to `transform`, and layout would win otherwise.
  const useLayout = !isMatched && !isExplosion;

  // Exit animates only transform (scale/rotate) + opacity — cheap, GPU-friendly,
  // no box-model repaints. Special matches get a longer destruction window for the spin.
  const exitDuration = isMatched && isSpecialMatch ? 0.25 : 0.15;
  const transition = useLayout
    ? { layout: { type: "tween", duration: 0.1, ease: "easeOut" }, type: "spring", stiffness: 550, damping: 16 }
    : { duration: exitDuration, ease: "easeOut" };

  return (
    <motion.div
      layout={useLayout}
      style={{
        position: "absolute",
        left: c * (CELL + GAP),
        top: r * (CELL + GAP),
        width: CELL,
        height: CELL,
        willChange: useLayout ? "transform" : "transform, opacity",
      }}
      transition={transition}
      initial={{ scale: 0.5, y: -30, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={exit}
      className={`flex items-center justify-center ${(exitKind || selected) ? "z-30" : "z-20"}`}
    >
      <button
        onPointerDown={onPointerDown}
        disabled={disabled}
        style={{ touchAction: "none" }}
        className={`flex items-center justify-center rounded-xl border select-none w-full h-full shadow-inner ${
          selected
            ? "bg-fuchsia-500/40 border-fuchsia-400 ring-2 ring-fuchsia-400 dark:bg-fuchsia-500/30 dark:border-fuchsia-400/70"
            : "bg-slate-200/60 border-white/80 hover:bg-slate-200/90 dark:bg-slate-900/60 dark:border-slate-700/50 dark:hover:bg-slate-900/80"
        }`}
      >
        <span className="text-2xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {EMOJIS[piece.type]}
        </span>
      </button>
    </motion.div>
  );
}