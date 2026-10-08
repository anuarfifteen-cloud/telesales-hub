import { motion } from "framer-motion";

/**
 * Animated "How to Play" entry pill for Blackjack 21 — gold-to-amber gradient,
 * bold uppercase label and a soft pulsing glow. Used by the game header and by
 * the Cashier overlay; both just open the shared guide modal.
 */
export default function HowToPlayButton({ onClick, label = "❓ How to Play", size = "sm", className = "" }) {
  const padding = size === "md" ? "px-5 py-2.5 text-[11px]" : "px-3 py-1.5 text-[10px]";

  return (
    <>
      <style>{`
        @keyframes howToPlayGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.55), 0 2px 8px rgba(0,0,0,0.35); }
          50% { box-shadow: 0 0 16px 4px rgba(212,175,55,0.55), 0 2px 8px rgba(0,0,0,0.35); }
        }
      `}</style>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 1.05 }}
        className={`how-to-play-btn ${padding} rounded-full font-black uppercase tracking-widest text-emerald-950 border border-amber-200/70 whitespace-nowrap ${className}`}
        style={{
          background: "linear-gradient(135deg, #fef1c9 0%, #f0b429 45%, #d4af37 100%)",
          animation: "howToPlayGlow 2.2s ease-in-out infinite",
        }}
      >
        {label}
      </motion.button>
    </>
  );
}