import { motion } from "framer-motion";
import { EMOJIS } from "@/hooks/useMatch3";
import { CELL, GAP } from "./constants";

// Clean, mobile-first tile. One resting state per piece.
// - Enter: spring bounce in (spawn / refill).
// - Fall (gravity): `layout` FLIP with a weighty spring, staggered per row
//   of drop distance so clusters ripple downward.
// - Landing: a one-shot scaleY squash-and-stretch "thud" (subtle, ~130ms),
//   triggered by a squash signal, delayed to land at the end of the fall.
// - Exit (cleared): one parallel fade + shrink.
const ENTER = { scale: 0.5, opacity: 0 };
const REST = { scale: 1, opacity: 1 };
const EXIT = { scale: 0, opacity: 0 };

const ROW_STAGGER = 0.015; // 15ms per row of drop
const FALL_DUR = 0.22;     // squash fires at ~end of the weighty fall

export default function Candy({
  piece,
  r,
  c,
  fallRows,
  squashSignal,
  squashFallRows,
  selected,
  onPointerDown,
  disabled,
}) {
  const fallStagger = fallRows > 0 ? fallRows * ROW_STAGGER : 0;
  const squash = squashSignal > 0;
  const squashDelay = squash ? squashFallRows * ROW_STAGGER + FALL_DUR : 0;

  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 260, damping: 24, mass: 0.85, delay: fallStagger },
        default: { type: "spring", stiffness: 420, damping: 26 },
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
      <motion.div
        key={squash ? `sq${squashSignal}` : "idle"}
        animate={squash ? { scaleY: [1, 0.88, 1.06, 1] } : { scaleY: 1 }}
        transition={{ duration: 0.13, delay: squashDelay, ease: "easeOut" }}
        style={{
          transformOrigin: "bottom center",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
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
    </motion.div>
  );
}