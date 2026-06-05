import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const PRIZES = {
  0: {
    title: "Try again tomorrow! 😢",
    body: "The box was empty today. Better luck next time!",
    color: "from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
    border: "border-slate-300 dark:border-slate-600",
    emoji: "📭",
  },
  1: {
    title: "Winner! 🎉",
    body: "You found 1 Token! 🪙",
    color: "from-amber-50 to-yellow-100 dark:from-amber-950/60 dark:to-yellow-900/40",
    border: "border-amber-300 dark:border-amber-700",
    emoji: "🪙",
  },
  3: {
    title: "JACKPOT! 💎",
    body: "You struck gold! You found 3 Tokens!",
    color: "from-violet-50 to-purple-100 dark:from-violet-950/60 dark:to-purple-900/40",
    border: "border-violet-400 dark:border-violet-600",
    emoji: "💎",
  },
};

export default function MysteryBoxModal({ prize, onClaim, claiming }) {
  if (prize === null) return null;
  const info = PRIZES[prize];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={`w-full max-w-xs rounded-3xl border-2 bg-gradient-to-br ${info.color} ${info.border} shadow-2xl p-6 flex flex-col items-center gap-4 text-center`}
        >
          <div className="text-6xl">{info.emoji}</div>
          <div>
            <h2 className="text-xl font-black text-foreground leading-tight">{info.title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{info.body}</p>
          </div>
          <Button
            onClick={onClaim}
            disabled={claiming}
            className="w-full font-black tracking-wide bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-2xl py-3"
          >
            {claiming ? "Saving..." : "Claim & Close"}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}