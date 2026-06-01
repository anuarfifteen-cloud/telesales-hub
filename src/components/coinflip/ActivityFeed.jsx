import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

const LIVE_FEED_KEY = "liveFeedEnabled";

export default function ActivityFeed({ currentUserId }) {
  const [feed, setFeed] = useState([]);
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(LIVE_FEED_KEY) !== "false"
  );

  // Re-check if the setting changes (e.g. admin toggled in same session)
  useEffect(() => {
    const check = () => setEnabled(localStorage.getItem(LIVE_FEED_KEY) !== "false");
    window.addEventListener("storage", check);
    const interval = setInterval(check, 3000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  useEffect(() => {
    // Load recent activity on mount (all players, including self)
    base44.entities.CoinFlipGame.list("-created_date", 10).then((games) => {
      setFeed(games.slice(0, 5));
    });

    // Subscribe to real-time updates
    const unsub = base44.entities.CoinFlipGame.subscribe((event) => {
      if (event.type === "create") {
        setFeed((prev) => [event.data, ...prev].slice(0, 5));
      }
    });

    return unsub;
  }, []);

  if (!enabled || feed.length === 0) return null;

  const getName = (game) => {
    const isMe = game.user_id === currentUserId;
    if (isMe) return "You";
    if (game.user_email) return game.user_email.split("@")[0];
    return "Someone";
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
        🔴 Live Activity
      </p>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {feed.map((game) => {
            const isMe = game.user_id === currentUserId;
            return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${
                game.result === "win"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
              } ${isMe ? "ring-1 ring-blue-300 dark:ring-blue-700" : ""}`}
            >
              <span className="text-base">{game.result === "win" ? "🎉" : "💸"}</span>
              <span className="flex-1 text-foreground">
                <strong>{getName(game)}</strong>
                {isMe && <span className="ml-1 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">YOU</span>}
                {" "}
                {game.result === "win" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    won {game.wager} tokens!
                  </span>
                ) : (
                  <span className="text-red-500 dark:text-red-400 font-semibold">
                    lost {game.wager} tokens
                  </span>
                )}
              </span>
              <img
                src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
                alt="token"
                className="w-3.5 h-3.5 opacity-60"
              />
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}