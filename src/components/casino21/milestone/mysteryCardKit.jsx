import { motion } from "framer-motion";
import { Flame, Zap, Coins } from "lucide-react";
import { RankedCardBack } from "./RankedPlayingCard";

// Shared building blocks for BOTH Mystery Card popups (the daily first-launch
// card and the bonus card unlocked by claiming every daily mission): reward
// metadata, the MM:SS formatter and the 3D flip card itself.
export const REWARD_META = {
  surge_2x: {
    icon: Flame,
    label: "2× Rank Surge",
    sub: "30-Minute 2× Rank Boost",
    color: "#f43f5e",
    durationMs: 30 * 60 * 1000,
    pill: "🔥 2× Surge",
  },
  bet_cap_25: {
    icon: Zap,
    label: "High Roller Pass",
    sub: "20-MIN 25-CHIP RANK BET CAP",
    color: "#f59e0b",
    durationMs: 20 * 60 * 1000,
    pill: "⚡ Max Bet 25",
  },
  chips_100: {
    icon: Coins,
    label: "Direct Drop",
    sub: "+100 Chips · +100 Rank Points",
    color: "#10b981",
    durationMs: 0,
    pill: null,
  },
};

// Human-readable reward name, used by the players' UI and the admin monitor.
export function rewardLabel(type) {
  return REWARD_META[type]?.label || "Unknown Reward";
}

export function fmtMMSS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// One card in the three-card fan. Face-down uses the Ranked ruby-red card back;
// only the chosen card flips to its reward face — the unchosen two stay fully
// face-down.
export function MysteryCardFlip({ index, reward, selected, onPick, busy }) {
  const meta = REWARD_META[reward.type];
  const Icon = meta.icon;
  const isChosen = selected === index;
  const flipped = isChosen;

  return (
    <button
      type="button"
      onClick={() => !flipped && !busy && onPick(index)}
      disabled={flipped || busy}
      className="relative w-24 h-36 sm:w-28 sm:h-40 flex-shrink-0 focus:outline-none"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Back (face-down) */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 10,
          }}
        >
          <RankedCardBack />
        </div>
        {/* Face (reward) */}
        <div
          className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center text-center px-1.5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 10,
            background: "linear-gradient(160deg, #1a1209 0%, #0c0a06 100%)",
            border: `1.5px solid ${meta.color}`,
            boxShadow: `0 0 18px ${meta.color}99, inset 0 0 12px ${meta.color}33`,
          }}
        >
          {/* gold inner trim */}
          <div
            className="absolute inset-1"
            style={{ borderRadius: 7, border: "1px solid rgba(212,175,55,0.35)" }}
          />
          <div
            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1"
            style={{
              background: `${meta.color}22`,
              border: `1px solid ${meta.color}`,
              boxShadow: isChosen ? `0 0 10px ${meta.color}66` : "none",
            }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: meta.color }} />
          </div>
          <p
            className="relative text-[11px] sm:text-xs font-black uppercase tracking-wide leading-tight"
            style={{ color: meta.color, fontFamily: "Cinzel, serif" }}
          >
            {meta.label}
          </p>
          <p className="relative text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-amber-100/70 mt-0.5 leading-tight">
            {meta.sub}
          </p>
        </div>
      </motion.div>
    </button>
  );
}