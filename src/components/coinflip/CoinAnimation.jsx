import { motion, AnimatePresence } from "framer-motion";

export default function CoinAnimation({ flipping, outcome }) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Glow */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${
          flipping ? "opacity-60 bg-amber-400" : "opacity-20 bg-amber-300"
        }`}
      />

      <motion.div
        className="w-24 h-24 rounded-full relative"
        animate={
          flipping
            ? { rotateY: [0, 360, 720, 1080, 1440, 1800], scale: [1, 1.05, 1] }
            : { rotateY: 0, scale: 1 }
        }
        transition={flipping ? { duration: 2, ease: "easeInOut" } : { duration: 0.3 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Coin face */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-4 border-amber-600 shadow-2xl flex items-center justify-center text-4xl select-none">
          {!flipping && outcome
            ? outcome === "heads"
              ? "👑"
              : "🌀"
            : "🪙"}
        </div>
      </motion.div>
    </div>
  );
}