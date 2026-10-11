import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MiniChipIcon from "../MiniChipIcon";

// Brief win/loss pop-out shown the moment a PvP round resolves for this player.
// Auto-dismisses after a short beat so the next round can start without a long
// wait — tapping it dismisses immediately too.
export default function MpResultPopout({ result, onDismiss }) {
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  const flag = result?.flag;
  const amount = Number(result?.amount) || 0;
  const isWin = flag === "WINNER" || flag === "SPLIT";
  const isRefund = flag === "REFUND";

  const tone = isWin
    ? {
        ring: "border-amber-300",
        glow: "0 0 32px rgba(212,175,55,0.55)",
        bg: "linear-gradient(160deg, #1a4336 0%, #0f2b22 100%)",
        label: isWin && flag === "SPLIT" ? "SPLIT POT" : "YOU WIN",
        text: "text-amber-200",
      }
    : isRefund
    ? {
        ring: "border-slate-300/60",
        glow: "0 0 24px rgba(148,163,184,0.35)",
        bg: "linear-gradient(160deg, #1f2937 0%, #111827 100%)",
        label: "PUSH",
        text: "text-slate-100",
      }
    : {
        ring: "border-rose-400/70",
        glow: "0 0 28px rgba(244,63,94,0.45)",
        bg: "linear-gradient(160deg, #3f1d1d 0%, #1f1212 100%)",
        label: "YOU LOSE",
        text: "text-rose-200",
      };

  return (
    <AnimatePresence>
      {flag && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <div className="absolute inset-0 bg-black/40" />
          <motion.div
            initial={{ scale: 0.6, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className={`relative w-full max-w-xs rounded-3xl border-2 ${tone.ring} px-6 py-7 text-center overflow-hidden`}
            style={{ background: tone.bg, boxShadow: tone.glow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20"
              style={{ background: isWin ? "#d4af37" : isRefund ? "#94a3b8" : "#f43f5e" }}
            />
            <p className={`text-2xl font-black uppercase tracking-widest ${tone.text}`}>
              {tone.label}
            </p>
            {isWin && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-amber-200 font-black text-xl tabular-nums">
                <MiniChipIcon size={20} /> +{amount}
              </p>
            )}
            {isRefund && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-slate-100 font-bold text-lg tabular-nums">
                <MiniChipIcon size={18} /> {amount} returned
              </p>
            )}
            {!isWin && !isRefund && (
              <p className="mt-2 text-rose-200/90 font-bold text-sm">
                Bet forfeited to the pot
              </p>
            )}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Tap to continue
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}