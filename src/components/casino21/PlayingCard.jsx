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
        <div className="h-full w-full rounded-lg bg-white p-1 shadow-lg overflow-hidden">
          <div className="h-full w-full rounded-sm bg-blue-900 relative overflow-hidden border border-white/30 m-1 flex items-center justify-center">
            <span className="text-white/50 text-2xl leading-none">♦</span>
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