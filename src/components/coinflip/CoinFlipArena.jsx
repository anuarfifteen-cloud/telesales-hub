import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import CoinAnimation from "./CoinAnimation";
import FlipResult from "./FlipResult";
import ActivityFeed from "./ActivityFeed";
import { toast } from "sonner";
import { Crown, Zap } from "lucide-react";
import { playClick, playWin, playLoss } from "@/lib/sounds";

const QUICK_BETS = [1, 2, 5, 10];

export default function CoinFlipArena({ user, onUserUpdate, isAdmin }) {
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

    playClick();
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
    won ? playWin() : playLoss();
    setShowResult(true);
  };

  const maxWager = Math.max(1, tokens);
  const canFlip = !flipping && tokens >= 1 && !!choice;

  return (
    <>
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
      {/* Container - Premium Dark Slate Glass matching Hub styling */}
      <div className="bg-[#1e2330] rounded-[24px] border border-slate-800/60 shadow-2xl overflow-hidden transition-all duration-300">

        {/* Navigation Sub-Tabs Layout */}
        <div className="flex border-b border-slate-800/80 bg-[#161a24]/60 p-1 gap-1">
          {[["game", "🎮 Game"], ["stats", "📊 Stats"], ["history", "📜 History"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                activeView === id
                  ? "text-amber-400 bg-[#1e2330] border border-slate-800/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── GAME MODULE ── */}
        {activeView === "game" && (
          <div className="p-6 flex flex-col items-center gap-6">

            {/* Account Balance Row */}
            <div className="w-full flex items-center justify-between border-b border-slate-800/40 pb-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest font-black">Your Balance</span>
              <div className="flex items-center gap-2 bg-[#161a24] border border-amber-500/30 rounded-full px-4 py-1.5 shadow-inner">
                <img
                  src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
                  alt="token" className="w-4 h-4 object-contain animate-pulse"
                />
                <span className="text-amber-400 font-black text-sm tabular-nums">{tokens}</span>
              </div>
            </div>

            {/* Main Coin Animation Anchor Frame */}
            <div className="relative py-4">
              <CoinAnimation flipping={flipping} outcome={lastResult?.outcome} chosenSide={choice} />
            </div>

            {/* Selection Input - Choice Switchers */}
            <div className="w-full">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black mb-2.5">Choose Your Side</p>
              <div className="flex gap-3 w-full">
                <button
                  disabled={flipping}
                  onClick={() => setChoice("heads")}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-200 border border-slate-800/80 flex items-center justify-center gap-2 ${
                    choice === "heads"
                      ? "bg-amber-500 border-amber-400 text-white shadow-xl shadow-amber-500/20 scale-[1.02]"
                      : "bg-[#161a24] text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Crown className="w-4 h-4" /> Heads
                </button>
                <button
                  disabled={flipping}
                  onClick={() => setChoice("tails")}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-200 border border-slate-800/80 flex items-center justify-center gap-2 ${
                    choice === "tails"
                      ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20 scale-[1.02]"
                      : "bg-[#161a24] text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Zap className="w-4 h-4" /> Tails
                </button>
              </div>
            </div>

            {/* Bet configuration array */}
            <div className="w-full">
              <div className="flex justify-between text-[11px] text-slate-400 mb-2 uppercase tracking-widest font-black">
                <span>Bet Amount</span>
                <span className="text-slate-500 font-medium">Min 1 · Max {tokens}</span>
              </div>
              
              {/* Central Manual input text area */}
              <input
                type="number"
                min={1}
                max={maxWager}
                disabled={flipping}
                value={wager}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (isNaN(v)) { setWager(""); return; }
                  setWager(Math.min(Math.max(v, 1), maxWager));
                }}
                className="w-full mb-3 bg-[#161a24] border border-slate-800/80 rounded-xl px-4 py-3 text-center text-white font-black text-xl focus:outline-none focus:border-amber-500/60 shadow-inner tracking-wide transition-all"
              />
              
              {/* Quick option chip arrays matching screenshot controls */}
              <div className="flex gap-2">
                {QUICK_BETS.filter((b) => b <= maxWager).map((b) => (
                  <button
                    key={b}
                    disabled={flipping}
                    onClick={() => setWager(b)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all duration-150 ${
                      wager === b
                        ? "bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-500/10"
                        : "bg-[#161a24] border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                <button
                  disabled={flipping}
                  onClick={() => setWager(maxWager)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all duration-150 ${
                    wager === maxWager
                      ? "bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-500/10"
                      : "bg-[#161a24] border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Potential evaluation projection row */}
            <div className="w-full flex items-center justify-between bg-[#161a24] border border-slate-800/60 rounded-xl px-4 py-3 shadow-inner">
              <span className="text-xs text-slate-400 font-bold">Potential Win</span>
              <div className="flex items-center gap-2">
                <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-4 h-4 object-contain" />
                <span className="text-emerald-400 font-black text-sm tracking-wide tabular-nums">{(wager || 0) * 2}</span>
              </div>
            </div>

            {/* Execution action core submission asset button */}
            <button
              onClick={handleFlip}
              disabled={!canFlip}
              className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-amber-400/20"
            >
              {flipping ? (
                <span className="animate-pulse">Flipping Arena Matrix…</span>
              ) : !choice ? (
                "Choose a Side"
              ) : tokens < 1 ? (
                "Insufficient Tokens"
              ) : (
                <>
                  <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-4 h-4 object-contain" />
                  Flip It!
                </>
              )}
            </button>

            <AnimatePresence>
              {showResult && lastResult && (
                <FlipResult result={lastResult} choice={choice} onClose={() => setShowResult(false)} />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── STATS MODULE ── */}
        {activeView === "stats" && (
          <div className="p-5 grid grid-cols-3 gap-3 bg-[#1e2330]">
            {[
              { label: "Total Flips", value: total, color: "text-slate-200" },
              { label: "Wins", value: wins, color: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]" },
              { label: "Losses", value: losses, color: "text-rose-400" },
              { label: "Win Rate", value: total > 0 ? `${winRate}%` : "—", color: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]" },
              { label: "Biggest Win", value: biggestWin || "—", color: "text-amber-400" },
              { label: "Biggest Loss", value: biggestLoss || "—", color: "text-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#161a24] rounded-xl p-3.5 flex flex-col items-center gap-1 border border-slate-800/40 shadow-inner">
                <span className={`text-xl font-black tracking-wide ${color}`}>{value}</span>
                <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY DATA TRANSCRIPT MODULE ── */}
        {activeView === "history" && (
          <div className="p-5 bg-[#1e2330]">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-10 tracking-wide font-medium">No system metrics recorded. Execute your first flip sequence!</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                {history.map((flip) => (
                  <div
                    key={flip.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs border backdrop-blur-sm shadow-sm transition-all duration-200 ${
                      flip.result === "win"
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
                        : "bg-rose-500/5 border-rose-500/20 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
                        alt="" className="w-4 h-4 object-contain"
                      />
                      <span className="text-slate-300 tracking-wide">
                        Wagered <strong className="text-white font-bold">{flip.wager}</strong> · chose <strong className="text-white uppercase font-bold">{flip.choice}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-sm tracking-wide tabular-nums ${flip.result === "win" ? "text-emerald-400" : "text-rose-400"}`}>
                        {flip.tokens_delta > 0 ? "+" : ""}{flip.tokens_delta}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${flip.result === "win" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {flip.result === "win" ? "Win" : "Loss"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Connected pipeline live global channel feed */}
    <ActivityFeed currentUserId={user?.id} isAdmin={isAdmin} />
    </>
  );
}