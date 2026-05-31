import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import CoinAnimation from "./CoinAnimation";
import FlipResult from "./FlipResult";
import { toast } from "sonner";
import { Crown, Zap } from "lucide-react";

const QUICK_BETS = [1, 2, 5, 10];

export default function CoinFlipArena({ user, onUserUpdate }) {
  const [choice, setChoice] = useState(null);
  const [wager, setWager] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [activeView, setActiveView] = useState("game");
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
  const total = history.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const biggestWin = history.reduce((max, h) => h.result === "win" ? Math.max(max, h.wager) : max, 0);
  const biggestLoss = history.reduce((max, h) => h.result === "loss" ? Math.max(max, h.wager) : max, 0);

  const handleFlip = async () => {
    if (flipping || !choice) return;
    if (wager < 1 || wager > tokens) { toast.error("Invalid wager amount."); return; }

    setFlipping(true);
    setShowResult(false);
    await new Promise((r) => setTimeout(r, 2000));

    const outcome = Math.random() < 0.5 ? "heads" : "tails";
    const won = outcome === choice;
    const delta = won ? wager : -wager;

    await base44.entities.CoinFlipGame.create({
      user_id: user.id, user_email: user.email,
      choice, outcome, wager,
      result: won ? "win" : "loss",
      tokens_delta: delta,
    });

    await base44.auth.updateMe({ earlyAccessTokens: tokens + delta });
    await onUserUpdate();
    queryClient.invalidateQueries({ queryKey: ["coinflip-history", user?.id] });

    setLastResult({ outcome, result: won ? "win" : "loss", delta, wager });
    setFlipping(false);
    setShowResult(true);
  };

  const maxWager = Math.max(1, Math.min(tokens, 10));

  return (
    <div className="flex flex-col gap-3">
      {/* Arena card — dark always */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-700">
          {[["game", "🎮 Game"], ["stats", "📊 Stats"], ["history", "📜 History"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex-1 py-2 text-xs font-semibold transition-all ${
                activeView === id
                  ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── GAME ── */}
        {activeView === "game" && (
          <div className="p-4 flex flex-col items-center gap-3">
            {/* Balance */}
            <div className="w-full flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Your Balance</span>
              <div className="flex items-center gap-1.5 bg-slate-700/60 border border-slate-600 rounded-full px-3 py-1">
                <img
                  src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
                  alt="token" className="w-4 h-4"
                />
                <span className="text-amber-400 font-black text-sm">{tokens}</span>
              </div>
            </div>

            {/* Coin animation */}
            <CoinAnimation flipping={flipping} outcome={lastResult?.outcome} chosenSide={choice} />

            {/* Choose side */}
            <div className="w-full">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">Choose Your Side</p>
              <div className="flex gap-2 w-full">
                <button
                  disabled={flipping}
                  onClick={() => setChoice("heads")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-1.5 ${
                    choice === "heads"
                      ? "bg-amber-500 border-amber-400 text-white shadow-lg"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Crown className="w-4 h-4" /> HEADS
                </button>
                <button
                  disabled={flipping}
                  onClick={() => setChoice("tails")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-1.5 ${
                    choice === "tails"
                      ? "bg-blue-500 border-blue-400 text-white shadow-lg"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Zap className="w-4 h-4" /> TAILS
                </button>
              </div>
            </div>

            {/* Bet amount */}
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 uppercase tracking-widest font-semibold">
                <span>Bet Amount</span>
                <span>Min 1 · Max {maxWager}</span>
              </div>
              <div className="flex gap-1.5 mb-2">
                {QUICK_BETS.filter((b) => b <= maxWager).map((b) => (
                  <button
                    key={b}
                    disabled={flipping}
                    onClick={() => setWager(b)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      wager === b
                        ? "bg-amber-500 border-amber-400 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                <button
                  disabled={flipping}
                  onClick={() => setWager(maxWager)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    wager === maxWager
                      ? "bg-amber-500 border-amber-400 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  MAX
                </button>
              </div>
              <div className="bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-2 text-center text-white font-black text-lg">
                {wager}
              </div>
            </div>

            {/* Flip button */}
            <button
              onClick={handleFlip}
              disabled={flipping || tokens < 1 || !choice}
              className="w-full py-3 rounded-xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {flipping ? "Flipping…" : !choice ? "Choose a Side" : tokens < 1 ? "No Tokens" : "🪙 Flip!"}
            </button>

            <AnimatePresence>
              {showResult && lastResult && (
                <FlipResult result={lastResult} choice={choice} onClose={() => setShowResult(false)} />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── STATS ── */}
        {activeView === "stats" && (
          <div className="p-4 grid grid-cols-3 gap-2">
            {[
              { label: "Total Flips", value: total, color: "text-white" },
              { label: "Wins", value: wins, color: "text-emerald-400" },
              { label: "Losses", value: losses, color: "text-red-400" },
              { label: "Win Rate", value: total > 0 ? `${winRate}%` : "—", color: "text-blue-400" },
              { label: "Biggest Win", value: biggestWin || "—", color: "text-amber-400" },
              { label: "Biggest Loss", value: biggestLoss || "—", color: "text-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-700/60 rounded-xl p-3 flex flex-col items-center gap-0.5 border border-slate-600">
                <span className={`text-xl font-black ${color}`}>{value}</span>
                <span className="text-[10px] text-slate-400 text-center">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeView === "history" && (
          <div className="p-4">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-6">No flips yet. Play your first game!</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {history.map((flip) => (
                  <div
                    key={flip.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
                      flip.result === "win"
                        ? "bg-emerald-900/30 border-emerald-800"
                        : "bg-red-900/30 border-red-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
                        alt="" className="w-4 h-4"
                      />
                      <span className="text-slate-300">
                        Bet <strong className="text-white">{flip.wager}</strong> · chose <strong className="text-white">{flip.choice}</strong>
                      </span>
                    </div>
                    <span className={`font-black text-xs ${flip.result === "win" ? "text-emerald-400" : "text-red-400"}`}>
                      {flip.tokens_delta > 0 ? "+" : ""}{flip.tokens_delta} {flip.result === "win" ? "WIN" : "LOSS"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}