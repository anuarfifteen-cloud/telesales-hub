import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

const LIVE_FEED_KEY = "liveFeedEnabled";

function CoinFlipRow({ game, currentUserId, isAdmin, onDeleted }) {
  const isMe = game.user_id === currentUserId;
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getName = () => {
    if (isMe) return "You";
    if (game.user_email) return game.user_email.split("@")[0];
    return "Someone";
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.CoinFlipGame.delete(game.id);
    onDeleted(game.id);
  };

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
        <strong>{getName()}</strong>
        {isMe && <span className="ml-1 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">YOU</span>}
        {" "}
        {game.result === "win" ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">won {game.wager} tokens!</span>
        ) : (
          <span className="text-red-500 dark:text-red-400 font-semibold">lost {game.wager} tokens</span>
        )}
      </span>
      <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-3.5 h-3.5 opacity-60" />
      {isAdmin && !confirmDel && (
        <button onClick={() => setConfirmDel(true)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {isAdmin && confirmDel && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleDelete} disabled={deleting} className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded disabled:opacity-50">
            {deleting ? "…" : "Del"}
          </button>
          <button onClick={() => setConfirmDel(false)} className="text-[9px] text-slate-500 hover:text-slate-700 font-semibold">✕</button>
        </div>
      )}
    </motion.div>
  );
}

export default function ActivityFeed({ currentUserId, isAdmin }) {
  const [feed, setFeed] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(LIVE_FEED_KEY) !== "false"
  );

  useEffect(() => {
    const check = () => setEnabled(localStorage.getItem(LIVE_FEED_KEY) !== "false");
    window.addEventListener("storage", check);
    const interval = setInterval(check, 3000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  useEffect(() => {
    base44.entities.CoinFlipGame.list("-created_date", 3).then((games) => {
      setFeed(games.slice(0, 3));
    });
    const unsub = base44.entities.CoinFlipGame.subscribe((event) => {
      if (event.type === "create") {
        setFeed((prev) => [event.data, ...prev].slice(0, 3));
      }
    });
    return unsub;
  }, []);

  const handleViewAll = async () => {
    if (showAll) { setShowAll(false); return; }
    setLoadingAll(true);
    const all = await base44.entities.CoinFlipGame.list("-created_date", 500);
    if (isAdmin) {
      setAllGames(all);
    } else {
      setAllGames([]);
    }
    setLoadingAll(false);
    setShowAll(true);
  };

  const handleDeleted = (id) => {
    setFeed((prev) => prev.filter((g) => g.id !== id));
    setAllGames((prev) => prev.filter((g) => g.id !== id));
  };

  if (!enabled || feed.length === 0) return null;

  const displayList = showAll ? allGames : feed;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          🔴 Live Activity
        </p>
        <button
          onClick={handleViewAll}
          disabled={loadingAll}
          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {loadingAll ? "Loading…" : showAll ? "Show Recent" : "View All"}
        </button>
      </div>
      <div className={`space-y-1.5 ${showAll ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
        <AnimatePresence initial={false}>
          {displayList.map((game) => (
            <CoinFlipRow
              key={game.id}
              game={game}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </AnimatePresence>
        {showAll && allGames.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No history yet.</p>
        )}
      </div>
    </div>
  );
}