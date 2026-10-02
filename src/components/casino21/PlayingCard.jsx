import { motion } from "framer-motion";

// Navy grid-pattern card back (criss-cross lines, no glyph).
function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-lg border border-slate-300 bg-blue-900 overflow-hidden shadow-lg"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)",
      }}
    >
      <div className="absolute inset-1 rounded border border-white/25" />
    </div>
  );
}

function CardFace({ card }) {
  const isRed = card?.color === "red";
  return (
    <div className="absolute inset-0 rounded-lg bg-white border border-slate-300 shadow-lg overflow-hidden">
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
  );
}

// Single preserve-3d container with two backface-hidden layers.
// The back is pre-rotated 180°, so animating the parent's rotateY physically
// hides the face until the flip crosses 90° — no mid-flip face flash.
export default function PlayingCard({ card, faceDown = false, delay = 0, isNew = false }) {
  return (
    <div
      className="relative h-20 w-14 sm:h-24 sm:w-16 flex-shrink-0"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={isNew ? { opacity: 0, y: -28, scale: 0.85, rotateY: faceDown ? 180 : 0 } : false}
        animate={{ opacity: 1, y: 0, scale: 1, rotateY: faceDown ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      >
        {/* Face — front, visible at rotateY 0 */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <CardFace card={card} />
        </div>
        {/* Back — pre-rotated 180°, visible only when parent flips past 90° */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardBack />
        </div>
      </motion.div>
    </div>
  );
}