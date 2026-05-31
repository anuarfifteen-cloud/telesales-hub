import { motion, AnimatePresence } from "framer-motion";

export default function FlipResult({ result, choice, onClose }) {
  const won = result.result === "win";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 40 }}
        transition={{ type: "spring", damping: 18, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xs rounded-3xl p-7 border-2 flex flex-col items-center gap-4 text-center shadow-2xl ${
          won
            ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-400"
            : "bg-red-50 dark:bg-red-950/90 border-red-400"
        }`}
      >
        <div className="text-6xl">{won ? "🎉" : "💸"}</div>
        <div>
          <p className={`text-2xl font-black ${won ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {won ? "YOU WON!" : "YOU LOST!"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            It landed on <strong>{result.outcome}</strong> — you picked <strong>{choice}</strong>
          </p>
        </div>
        <div className={`text-3xl font-black flex items-center gap-2 ${won ? "text-emerald-500" : "text-red-500"}`}>
          {won ? `+${result.wager}` : `-${result.wager}`}
          <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-7 h-7" />
        </div>
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 ${
            won
              ? "bg-emerald-500 hover:bg-emerald-600"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {won ? "Collect Winnings!" : "Try Again"}
        </button>
      </motion.div>
    </motion.div>
  );
}