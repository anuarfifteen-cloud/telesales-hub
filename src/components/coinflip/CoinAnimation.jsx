import { motion } from "framer-motion";
import { Crown, Zap } from "lucide-react";

export default function CoinAnimation({ flipping, outcome, chosenSide }) {
  const showFace = !flipping && outcome;
  const isHeads = showFace ? outcome === "heads" : chosenSide === "heads";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Glow */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${
          flipping ? "opacity-70 bg-amber-400" : "opacity-25 bg-amber-300"
        }`}
      />
      <motion.div
        animate={
          flipping
            ? { rotateY: [0, 180, 360, 540, 720, 900, 1080, 1260, 1440], scale: [1, 1.08, 1] }
            : { rotateY: 0, scale: 1 }
        }
        transition={flipping ? { duration: 2, ease: "easeInOut" } : { duration: 0.3 }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-4 border-amber-600 shadow-2xl flex items-center justify-center"
      >
        {flipping ? (
          <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/44c1b0077_tokens.png" alt="token" className="w-10 h-10" />
        ) : isHeads ? (
          <Crown className="w-9 h-9 text-amber-800" strokeWidth={2.5} />
        ) : (
          <Zap className="w-9 h-9 text-amber-800" strokeWidth={2.5} />
        )}
      </motion.div>
    </div>
  );
}