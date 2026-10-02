import { motion } from "framer-motion";

// A single playing card with a deal-in animation. `faceDown` renders the
// navy patterned card back; otherwise the rank + suit face is shown.
export default function PlayingCard({ card, faceDown = false, delay = 0, isNew = false }) {
  const isRed = card?.color === "red";

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      className="relative h-20 w-14 sm:h-24 sm:w-16 flex-shrink-0"
    >
      {faceDown ? (
        <div className="h-full w-full rounded-lg border-2 border-white bg-white shadow-lg overflow-hidden">
          {/* Dark blue inset rectangle */}
          <div
            className="h-full w-full m-1 rounded-md border border-indigo-300/30 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #1a237e 0%, #0d1654 100%)",
            }}
          >
            {/* Classic criss-cross diamond pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 7px)",
              }}
            />
            {/* Concentric inner border frame */}
            <div className="absolute inset-1.5 rounded border border-indigo-200/20" />
            {/* Subtle central emblem dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-indigo-200/15 border border-indigo-200/25" />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full w-full rounded-lg bg-white border border-slate-300 shadow-lg relative overflow-hidden">
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
      )}
    </motion.div>
  );
}