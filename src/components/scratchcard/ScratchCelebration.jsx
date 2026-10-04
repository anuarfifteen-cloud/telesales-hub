import { motion } from "framer-motion";
import ScratchPrizeIcon from "./ScratchPrizeIcon";
import { describeGrant, prizeTier } from "./scratchPrizes";

// Celebration beat between the final reveal and the result card. The scale
// follows the prize: a small win gets a quick sparkle burst, mid wins a blue
// glow, and rare prizes (a diamond or an exclusive theme) get a big-win
// spotlight with rotating light rays.
const STYLE = {
  none: {
    label: "NO MATCH",
    headline: "No three in a row",
    tint: "#94a3b8",
    sparks: 8,
    spread: 110,
    icon: 58,
    text: 22,
    backdrop: "rgba(6,2,20,0.8)",
  },
  small: {
    label: "WINNER",
    tint: "#ffd76a",
    sparks: 12,
    spread: 125,
    icon: 62,
    text: 23,
    backdrop: "rgba(6,2,20,0.8)",
  },
  medium: {
    label: "NICE WIN",
    tint: "#7dd3fc",
    sparks: 18,
    spread: 155,
    icon: 70,
    text: 26,
    rays: false,
    glow: "0 0 18px rgba(125,211,252,0.75)",
    backdrop: "radial-gradient(circle at 50% 46%, rgba(56,189,248,0.22), rgba(6,2,20,0.9) 60%)",
  },
  big: {
    label: "BIG WIN",
    tint: "#ffd76a",
    sparks: 26,
    spread: 200,
    icon: 86,
    text: 30,
    rays: true,
    glow: "0 0 28px rgba(255,215,106,0.9)",
    backdrop: "radial-gradient(circle at 50% 46%, rgba(255,209,102,0.3), rgba(6,2,20,0.94) 58%)",
  },
};

export default function ScratchCelebration({ granted }) {
  const tier = prizeTier(granted);
  const s = STYLE[tier];
  const { headline } = describeGrant(granted);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      style={{ background: s.backdrop }}
    >
      <style>{`
        @keyframes scratchRays { to { transform: rotate(360deg); } }
        @keyframes scratchGlowPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {s.rays && (
        <div
          style={{
            position: "absolute",
            width: "160vmax",
            height: "160vmax",
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, rgba(255,215,106,0.24) 0deg, transparent 22deg, rgba(255,215,106,0.24) 44deg, transparent 66deg, rgba(255,215,106,0.24) 88deg, transparent 110deg, rgba(255,215,106,0.24) 132deg, transparent 154deg)",
            animation: "scratchRays 16s linear infinite",
          }}
        />
      )}

      {Array.from({ length: s.sparks }).map((_, i) => {
        const angle = (i / s.sparks) * Math.PI * 2;
        const distance = s.spread + (i % 3) * 20;
        return (
          <motion.span
            key={`${tier}-${i}`}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: tier === "none" ? [0, 0.8, 0] : [0, 1, 0],
              scale: [0.3, 1, 0.65],
            }}
            transition={{
              duration: tier === "big" ? 1.5 : 1.05,
              delay: 0.05 * (i % 5),
              ease: "easeOut",
            }}
            style={{ position: "absolute", fontSize: tier === "big" ? 22 : 18, color: s.tint }}
          >
            {tier === "none" ? "•" : ["✨", "⭐", "💫"][i % 3]}
          </motion.span>
        );
      })}

      <motion.div
        initial={{ scale: 0.55, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 230, damping: 15 }}
        style={{ position: "relative", textAlign: "center", padding: 24 }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 6,
            color: s.tint,
            textShadow: s.glow || "none",
            animation: s.rays ? "scratchGlowPulse 0.9s ease-in-out infinite" : "none",
          }}
        >
          {s.label}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "18px 0 14px",
            filter: s.glow ? `drop-shadow(${s.glow})` : "none",
          }}
        >
          <ScratchPrizeIcon granted={granted} size={s.icon} />
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: s.text,
            fontWeight: 900,
            color: "#ffffff",
            textShadow: "0 3px 14px rgba(0,0,0,0.65)",
          }}
        >
          {headline || s.headline}
        </h3>
      </motion.div>
    </div>
  );
}