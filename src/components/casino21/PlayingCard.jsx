import { motion } from "framer-motion";

// Navy grid-pattern card back (criss-cross lines, no diamond) + 3D flip reveal.
function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-none border-[3px] border-black bg-blue-900 overflow-hidden shadow-lg"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)",
      }}
    >
      <div className="absolute inset-1 rounded-none border border-white/25" />
    </div>
  );
}

function CardFace({ card }) {
  const isRed = card?.color === "red";
  return (
    <div className="absolute inset-0 rounded-none bg-white border-[3px] border-black shadow-lg overflow-hidden">
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

export default function PlayingCard({ card, faceDown = false, backOnly = false, delay = 0, isNew = false, zIndex = 0, small = false }) {
  const sizeClass = small ? "h-16 w-11" : "h-20 w-14 sm:h-24 sm:w-16";
  // Back-only mode: render ONLY the card back. The face value is never mounted
  // in the DOM, so nothing can flash through during the deal-in animation.
  if (backOnly) {
    return (
      <motion.div
        initial={isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85 } : false}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
        className={`relative ${sizeClass} flex-shrink-0`}
        style={{ zIndex }}
      >
        <CardBack />
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      className={`relative ${sizeClass} flex-shrink-0`}
      style={{ perspective: 800, zIndex }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <CardFace card={card} />
        </div>
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
    </motion.div>
  );
}