import { motion } from "framer-motion";
import { EMOJIS } from "@/hooks/useMatch3";
import { CELL, GAP } from "./constants";

// Clean, mobile-first tile. One resting state per piece.
// - Enter: spring bounce in.
// - Survive (gravity): `layout` prop slides via FLIP.
// - Exit (cleared): one parallel fade + shrink — no spin, no explosion split.
const ENTER = { scale: 0.5, opacity: 0 };
const REST = { scale: 1, opacity: 1 };
const EXIT = { scale: 0, opacity: 0 };

export default function Candy({ piece, r, c, selected, onPointerDown, disabled }) {
  return (
    <motion.div
      layout
      transition={{
        layout: { type: "tween", duration: 0.16, ease: "easeOut" },
        type: "spring",
        stiffness: 420,
        damping: 26,
      }}
      style={{
        position: "absolute",
        left: c * (CELL + GAP),
        top: r * (CELL + GAP),
        width: CELL,
        height: CELL,
      }}
      initial={ENTER}
      animate={REST}
      exit={EXIT}
      className={`flex items-center justify-center ${selected ? "z-30" : "z-20"}`}
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