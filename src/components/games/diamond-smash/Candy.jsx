import { motion } from "framer-motion";
import { EMOJIS } from "@/hooks/useMatch3";
import { CELL, GAP } from "./constants";

// Exit keyframes — per your other project's smooth feel
// Matched (aligned 3/4/5 run tiles) → burst-squash pop
const MATCH_EXIT = { scale: [1, 1.5, 0], opacity: [1, 1, 0] };
// Explosion (4/5+ collateral tiles) → grow to 2×, quarter-turn then full flip, fade
const EXPLOSION_EXIT = { scale: [1, 2, 0], opacity: [1, 0.6, 0], rotate: [0, 90, 270] };

export default function Candy({ piece, r, c, selected, onPointerDown, isMatched, isExplosion, disabled }) {
  const exitKind = isMatched ? "match" : isExplosion ? "explosion" : undefined;
  const animate = isMatched
    ? MATCH_EXIT
    : isExplosion
    ? EXPLOSION_EXIT
    : { scale: 1, y: 0, opacity: 1 };

  // Surviving-piece gravity slides via the layout prop (0.18s easeOut);
  // refills bounce in on the spring; exit tiles animate over 0.22s easeOut.
  const transition = exitKind
    ? { layout: { duration: 0.18, ease: "easeOut" }, duration: 0.22, ease: "easeOut" }
    : { layout: { duration: 0.18, ease: "easeOut" }, type: "spring", stiffness: 550, damping: 11 };

  return (
    <motion.div
      layout
      style={{
        position: "absolute",
        left: c * (CELL + GAP),
        top: r * (CELL + GAP),
        width: CELL,
        height: CELL,
      }}
      transition={transition}
      initial={{ scale: 0.5, y: -30, opacity: 0 }}
      animate={animate}
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