import { motion } from "framer-motion";

export default function FlipResult({ result, choice, onClose }) {
  const won = result.result === "win";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className={`rounded-2xl p-5 border-2 flex flex-col items-center gap-3 text-center shadow-xl ${
        won
          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400"
          : "bg-red-50 dark:bg-red-950/50 border-red-400"
      }`}
    >
      <div className="text-5xl">{won ? "🎉" : "💸"}</div>
      <div>
        <p className={`text-xl font-black ${won ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {won ? "YOU WON!" : "YOU LOST!"}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          It landed on <strong>{result.outcome}</strong> — you picked <strong>{choice}</strong>
        </p>
      </div>
      <div className={`text-2xl font-black ${won ? "text-emerald-500" : "text-red-500"}`}>
        {won ? `+${result.wager}` : `-${result.wager}`} 🪙
      </div>
      <button
        onClick={onClose}
        className={`w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all ${
          won
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-red-500 hover:bg-red-600"
        }`}
      >
        {won ? "Collect Winnings!" : "Try Again"}
      </button>
    </motion.div>
  );
}