import { motion } from "framer-motion";
import { X, Swords } from "lucide-react";
import MiniChipIcon from "../MiniChipIcon";

// In-tab pop-out: appears the moment another player posts a challenge while
// this tab is open. Dismissing it (either button) refreshes the board.
export default function NewChallengeAlert({ challenge, onDismiss }) {
  const name = challenge?.creator_name || "A player";
  const wager = Number(challenge?.wager) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="fixed left-1/2 -translate-x-1/2 top-3 z-[80] w-[min(420px,calc(100vw-1.5rem))] rounded-2xl px-3.5 py-3"
      style={{
        background: "linear-gradient(140deg, rgba(20,44,35,0.98) 0%, rgba(7,25,19,0.98) 100%)",
        border: "1px solid rgba(212,175,55,0.55)",
        boxShadow:
          "0 18px 40px rgba(0,0,0,0.55), 0 0 22px rgba(212,175,55,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">
            New challenge
          </p>
          <p className="text-[13px] font-bold text-emerald-50 truncate flex items-center gap-1.5">
            {name} wagered
            <MiniChipIcon size={13} />
            <span className="tabular-nums" style={{ color: "#f3d98b" }}>
              {wager}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/50">
              chips
            </span>
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-950"
          style={{ background: "#d4af37" }}
        >
          <Swords className="w-3 h-3" /> View
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-1 rounded-full text-emerald-100/50 hover:text-emerald-100 hover:bg-white/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}