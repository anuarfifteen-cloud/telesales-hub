import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import CoinAnimation from "./CoinAnimation";
import FlipResult from "./FlipResult";
import FlipHistory from "./FlipHistory";
import FlipStats from "./FlipStats";
import { toast } from "sonner";

export default function CoinFlipArena({ user, onUserUpdate }) {
  const [choice, setChoice] = useState("heads");
  const [wager, setWager] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { outcome, result, delta }
  const [showResult, setShowResult] = useState(false);
  const queryClient = useQueryClient();

  const tokens = user?.earlyAccessTokens ?? 0;

  const { data: history = [] } = useQuery({
    queryKey: ["coinflip-history", user?.id],
    queryFn: () =>
      base44.entities.CoinFlipGame.filter({ user_id: user?.id }, "-created_date", 20),
    enabled: !!user?.id,
  });

  const wins = history.filter((h) => h.result === "win").length;
  const losses = history.filter((h) => h.result === "loss").length;

  // Current streak
  let streak = 0;
  let streakType = null;
  for (const h of history) {
    if (streakType === null) { streakType = h.result; streak = 1; }
    else if (h.result === streakType) streak++;
    else break;
  }

  const handleFlip = async () => {
    if (flipping) return;
    if (wager < 1 || wager > tokens) {
      toast.error("Invalid wager amount.");
      return;
    }

    setFlipping(true);
    setShowResult(false);

    // Simulate flip duration
    await new Promise((r) => setTimeout(r, 2000));

    const outcome = Math.random() < 0.5 ? "heads" : "tails";
    const won = outcome === choice;
    const delta = won ? wager : -wager;
    const newTokens = tokens + delta;

    // Persist game record
    await base44.entities.CoinFlipGame.create({
      user_id: user.id,
      user_email: user.email,
      choice,
      outcome,
      wager,
      result: won ? "win" : "loss",
      tokens_delta: delta,
    });

    // Update token balance
    await base44.auth.updateMe({ earlyAccessTokens: newTokens });
    await onUserUpdate();

    queryClient.invalidateQueries({ queryKey: ["coinflip-history", user?.id] });

    setLastResult({ outcome, result: won ? "win" : "loss", delta, wager });
    setFlipping(false);
    setShowResult(true);
  };

  const maxWager = Math.min(tokens, 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">🎰 Coin Flip Arena</h3>
        <p className="text-xs text-muted-foreground">Wager your tokens — double or nothing!</p>
      </div>

      {/* Stats strip */}
      <FlipStats wins={wins} losses={losses} streak={streak} streakType={streakType} tokens={tokens} />

      {/* Coin + Controls */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 flex flex-col items-center gap-5 border border-slate-700 shadow-xl">
        {/* Coin */}
        <CoinAnimation flipping={flipping} outcome={lastResult?.outcome} />

        {/* Choice buttons */}
        <div className="flex gap-3 w-full">
          {["heads", "tails"].map((side) => (
            <button
              key={side}
              disabled={flipping}
              onClick={() => setChoice(side)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                choice === side
                  ? "bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30"
                  : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {side === "heads" ? "👑 Heads" : "🌀 Tails"}
            </button>
          ))}
        </div>

        {/* Wager */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Wager</span>
            <span>{wager} token{wager !== 1 ? "s" : ""}</span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1, maxWager)}
            value={wager}
            disabled={flipping || tokens < 1}
            onChange={(e) => setWager(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>1</span>
            <span>{Math.max(1, maxWager)}</span>
          </div>
        </div>

        {/* Flip Button */}
        <button
          onClick={handleFlip}
          disabled={flipping || tokens < 1}
          className="w-full py-3.5 rounded-xl font-black text-base tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {flipping ? "Flipping…" : tokens < 1 ? "No Tokens" : "🪙 FLIP!"}
        </button>
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {showResult && lastResult && (
          <FlipResult
            result={lastResult}
            choice={choice}
            onClose={() => setShowResult(false)}
          />
        )}
      </AnimatePresence>

      {/* History */}
      <FlipHistory history={history} />
    </div>
  );
}