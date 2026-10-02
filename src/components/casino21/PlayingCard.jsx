import { motion } from "framer-motion";

// A single playing card with a deal-in animation. `faceDown` renders the
// navy patterned card back; otherwise the rank + suit face is shown.
export default function PlayingCard({ card, faceDown = false, delay = 0, isNew = false }) {
  const isRed = card?.color === "red";

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      className="relative h-20 w-14 sm:h-24 sm:w-16 flex-shrink-0"
    >
      {faceDown ? (
        <div
          className="h-full w-full rounded-lg border border-indigo-300/40 shadow-lg overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(45deg, #1a237e 0 6px, #283593 6px 12px), linear-gradient(135deg,#3949ab,#1a237e)",
            backgroundBlendMode: "overlay",
          }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-amber-300/80 text-lg font-black tracking-widest rotate-12">21</span>
          </div>
        </div>
      ) : (
        <div className="h-full w-full rounded-lg bg-white border border-slate-300 shadow-lg flex flex-col justify-between p-1 sm:p-1.5">
          <div className={`text-left leading-none ${isRed ? "text-red-600" : "text-slate-900"}`}>
            <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
            <span className="block text-[10px] sm:text-xs">{card.suit}</span>
          </div>
          <div className={`text-center text-xl sm:text-2xl ${isRed ? "text-red-600" : "text-slate-900"}`}>
            {card.suit}
          </div>
          <div className={`text-right leading-none rotate-180 ${isRed ? "text-red-600" : "text-slate-900"}`}>
            <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
            <span className="block text-[10px] sm:text-xs">{card.suit}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}