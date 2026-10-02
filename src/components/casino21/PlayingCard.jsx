import { motion } from "framer-motion";

// A single playing card. Face-up cards show rank+suit; the dealer hole card
// renders the premium navy card back until `faceDown` flips to false, at which
// point a 3D Y-axis flip (rotateY 180→0) reveals the face with a spring pop.
export default function PlayingCard({ card, faceDown = false, delay = 0, isNew = false }) {
  const isRed = card?.color === "red";

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85, rotateY: faceDown ? 180 : 0 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1, rotateY: faceDown ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative h-20 w-14 sm:h-24 sm:w-16 flex-shrink-0"
    >
      {/* Face layer (front, rotateY 0) */}
      <div
        className="absolute inset-0 rounded-lg bg-white border border-slate-300 shadow-lg overflow-hidden"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
      >
        <div className={`absolute top-1 left-1.5 leading-none ${isRed ? "text-red-600" : "text-slate-900"}`}>
          <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
          <span className="block text-[10px] sm:text-xs">{card.suit}</span>
        </div>
        <div className={`absolute inset-0 flex items-center justify-center text-xl sm:text-2xl ${isRed ? "text-red-600" : "text-slate-900"}`}>
          {card.suit}
        </div>
        <div className={`absolute bottom-1 right-1.5 leading-none rotate-180 ${isRed ? "text-red-600" : "text-slate-900"}`}>
          <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
          <span className="block text-[10px] sm:text-xs">{card.suit}</span>
        </div>
      </div>

      {/* Back layer (rotated 180, premium navy card back) */}
      <div
        className="absolute inset-0 rounded-lg bg-white p-1 shadow-lg overflow-hidden"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        <div className="h-full w-full rounded-sm bg-blue-900 relative overflow-hidden border border-white/30 m-1 flex items-center justify-center">
          <span className="text-white/50 text-2xl leading-none">♦</span>
        </div>
      </div>
    </motion.div>
  );
}