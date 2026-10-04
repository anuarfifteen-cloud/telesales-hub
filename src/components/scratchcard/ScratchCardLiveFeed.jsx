import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import BlackChipIcon from "@/components/casino21/BlackChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

const FOMO_LINES = [
  "just scratched a winner!",
  "just hit three in a row!",
  "just scored big!",
  "just cashed in!",
  "got lucky!",
];

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Live ticker of the five most recent winning tickets. Only tickets the player
 * finished scratching are shown, so nobody's unrevealed prize gets spoiled.
 */
export default function ScratchCardLiveFeed() {
  const [wins, setWins] = useState([]);

  const load = async () => {
    const rows = await base44.entities.ScratchCardLog.filter(
      { outcome: "win", collected: true },
      "-updated_date",
      5
    );
    setWins(rows);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.ScratchCardLog.subscribe(() => load());
    return unsub;
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Scratch Card Wins</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {wins.map((ticket, i) => {
            const amount = Number(ticket.prize_amount) || 0;
            const isChips = ticket.prize_type === "chips";
            const isTokens = ticket.prize_type === "tokens";
            const isDiamond = ticket.prize_type === "diamond";
            const isTheme = ticket.prize_type === "theme";
            const name = ticket.user_name?.split(" ")[0] || "Someone";

            const fomo = isDiamond
              ? "just hit the diamond jackpot! 💎"
              : isTheme
              ? "just unlocked an exclusive theme! 🎨"
              : FOMO_LINES[i % FOMO_LINES.length];

            const prizeText = isDiamond
              ? "1 💎 Diamond"
              : isTheme
              ? ticket.prize_label || "An exclusive theme"
              : `${amount} ${isChips ? `chip${amount !== 1 ? "s" : ""}` : `token${amount !== 1 ? "s" : ""}`}`;

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2"
              >
                {isChips ? (
                  <BlackChipIcon size={20} className="flex-shrink-0" />
                ) : isTokens ? (
                  <img src={TOKEN_IMG} alt="token" className="w-5 h-5 flex-shrink-0 object-contain" />
                ) : (
                  <span className="text-lg flex-shrink-0">{isDiamond ? "💎" : "🎨"}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 truncate">
                    <span className="font-black">{name}</span> {fomo}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium">
                    Won <span className="font-black">{prizeText}</span> · {timeAgo(ticket.updated_date || ticket.timestamp)}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                  {isDiamond ? "+1 💎" : isTheme ? "🎨" : `+${amount}`}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}