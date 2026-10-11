import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MiniChipIcon from "../MiniChipIcon";

// The central pot banner for PvP mode. Shows the accumulated chip pool (sum of
// all equal wagers) for the current round. `chipFx` increments each time a
// player places or matches a wager, popping a brief chip-drop animation + chime
// is played by the caller.
export default function MpPotBanner({ pot = 0, commonWager = 0, active = false, chipFx = 0 }) {
  const hasPot = Number(pot) > 0;
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    if (!chipFx) return;
    const id = chipFx;
    setBursts((b) => [...b, id]);
    const t = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
    return () => clearTimeout(t);
  }, [chipFx]);

  return (
    <div
      className="rounded-2xl border p-3 transition-all relative overflow-hidden"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(16,185,129,0.10))"
          : "rgba(255,255,255,0.06)",
        borderColor: active ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        boxShadow: active ? "0 0 22px rgba(212,175,55,0.18)" : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
          Total Pot
        </span>
        {Number(commonWager) > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">
            {commonWager} chip buy-in
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 py-1 relative">
        <MiniChipIcon size={22} />
        <span className="text-2xl font-black text-amber-300 tabular-nums">
          {hasPot ? pot : "—"}
        </span>
        {/* Chip-drop flourish: a few chips spring up and fade when a wager lands */}
        <AnimatePresence>
          {bursts.map((id) => (
            <motion.div
              key={id}
              className="absolute left-1/2 top-1 pointer-events-none"
              initial={{ opacity: 0, y: 10, scale: 0.4 }}
              animate={{ opacity: 1, y: -22, scale: 1, x: -10 }}
              exit={{ opacity: 0, y: -30, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, duration: 0.7 }}
            >
              <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-emerald-100/60">
        Winner takes all
      </p>
    </div>
  );
}