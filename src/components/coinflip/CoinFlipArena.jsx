import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import CoinAnimation from "./CoinAnimation";
import FlipResult from "./FlipResult";
import ActivityFeed from "./ActivityFeed";
import { toast } from "sonner";
import { Crown, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { playClick, playWin, playLoss } from "@/lib/sounds";

const QUICK_BETS = [1, 2, 5, 10];

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

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
  const biggestWin = history.reduce(
    (max, h) => (h.result === "win" ? Math.max(max, h.wager) : max),
    0
  );
  const biggestLoss = history.reduce(
    (max, h) => (h.result === "loss" ? Math.max(max, h.wager) : max),
    0
  );

  const handleFlip = async () => {
    if (flipping || !choice) return;
    if (wager < 1 || wager > tokens) {
      toast.error("Invalid wager amount.");
      return;
    }

    playClick();
    setFlipping(true);
    setShowResult(false);
    await new Promise((r) => setTimeout(r, 2000));

    const outcome = Math.random() < 0.5 ? "heads" : "tails";
    const won = outcome === choice;
    const delta = won ? wager : -wager;

    await base44.entities.CoinFlipGame.create({
      user_id: user.id,
      user_email: user.email,
      choice,
      outcome,
      wager,
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
        {/* Main card — uses bg-card so it follows the app theme */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

          {/* Tab strip */}
          <div className="flex gap-1 p-1 bg-muted/50 border-b border-border">
            {[
              ["game",    "🎮 Game"],
              ["stats",   "📊 Stats"],
              ["history", "📜 History"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`
                  flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl
                  transition-all duration-150
                  ${activeView === id
                    ? "bg-background text-foreground border border-border shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── GAME VIEW ── */}
          {activeView === "game" && (
            <div className="p-6 flex flex-col items-center gap-5">

              {/* Balance */}
              <div className="w-full flex items-center justify-between pb-3 border-b border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                  Balance
                </span>
                <div className="flex items-center gap-2 bg-muted rounded-full px-3.5 py-1.5 border border-border">
                  <img src={TOKEN_IMG} alt="token" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm tabular-nums">
                    {tokens}
                  </span>
                </div>
              </div>

              {/* Coin animation */}
              <div className="relative py-3">
                <CoinAnimation
                  flipping={flipping}
                  outcome={lastResult?.outcome}
                  chosenSide={choice}
                />
              </div>

              {/* Side picker */}
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                  Choose your side
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    disabled={flipping}
                    onClick={() => setChoice("heads")}
                    className={`
                      flex-1 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase
                      transition-all duration-150 border flex items-center justify-center gap-2
                      disabled:opacity-50
                      ${choice === "heads"
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/40"
                      }
                    `}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Heads
                  </button>
                  <button
                    disabled={flipping}
                    onClick={() => setChoice("tails")}
                    className={`
                      flex-1 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase
                      transition-all duration-150 border flex items-center justify-center gap-2
                      disabled:opacity-50
                      ${choice === "tails"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/40"
                      }
                    `}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Tails
                  </button>
                </div>
              </div>

              {/* Wager */}
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold">
                  <span>Bet amount</span>
                  <span>1 – {tokens} tokens</span>
                </div>

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
                  className="
                    w-full mb-2.5 bg-muted border border-border rounded-xl
                    px-4 py-3 text-center text-foreground font-bold text-xl
                    focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60
                    tabular-nums transition-all disabled:opacity-50
                  "
                />

                <div className="flex gap-2">
                  {QUICK_BETS.filter((b) => b <= maxWager).map((b) => (
                    <button
                      key={b}
                      disabled={flipping}
                      onClick={() => setWager(b)}
                      className={`
                        flex-1 py-2 rounded-lg text-xs font-semibold border
                        transition-all duration-150 disabled:opacity-50
                        ${wager === b
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }
                      `}
                    >
                      {b}
                    </button>
                  ))}
                  <button
                    disabled={flipping}
                    onClick={() => setWager(maxWager)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-bold border
                      transition-all duration-150 disabled:opacity-50
                      ${wager === maxWager
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }
                    `}
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Potential win */}
              <div className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 border border-border">
                <span className="text-xs text-muted-foreground font-medium">Potential win</span>
                <div className="flex items-center gap-1.5">
                  <img src={TOKEN_IMG} alt="token" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-green-600 dark:text-green-400 font-bold text-sm tabular-nums">
                    +{(wager || 0) * 2}
                  </span>
                </div>
              </div>

              {/* Flip button */}
              <button
                onClick={handleFlip}
                disabled={!canFlip}
                className="
                  w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest
                  bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                  text-white
                  shadow-sm active:scale-[0.98]
                  transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-amber-400/30
                "
              >
                {flipping ? (
                  <span className="animate-pulse">Flipping…</span>
                ) : !choice ? (
                  "Choose a side first"
                ) : tokens < 1 ? (
                  "Not enough tokens"
                ) : (
                  <>
                    <img src={TOKEN_IMG} alt="" className="w-4 h-4 object-contain" />
                    Flip it!
                  </>
                )}
              </button>

              <AnimatePresence>
                {showResult && lastResult && (
                  <FlipResult
                    result={lastResult}
                    choice={choice}
                    onClose={() => setShowResult(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── STATS VIEW ── */}
          {activeView === "stats" && (
            <div className="p-5 grid grid-cols-3 gap-3">
              {[
                {
                  label: "Total flips",
                  value: total,
                  icon: <Minus className="w-3.5 h-3.5" />,
                  color: "text-foreground",
                  bg: "bg-muted",
                },
                {
                  label: "Wins",
                  value: wins,
                  icon: <TrendingUp className="w-3.5 h-3.5" />,
                  color: "text-green-600 dark:text-green-400",
                  bg: "bg-green-50 dark:bg-green-950/30",
                  border: "border-green-200 dark:border-green-800/40",
                },
                {
                  label: "Losses",
                  value: losses,
                  icon: <TrendingDown className="w-3.5 h-3.5" />,
                  color: "text-red-600 dark:text-red-400",
                  bg: "bg-red-50 dark:bg-red-950/30",
                  border: "border-red-200 dark:border-red-800/40",
                },
                {
                  label: "Win rate",
                  value: total > 0 ? `${winRate}%` : "—",
                  color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50 dark:bg-blue-950/30",
                  border: "border-blue-200 dark:border-blue-800/40",
                },
                {
                  label: "Best win",
                  value: biggestWin || "—",
                  color: "text-amber-600 dark:text-amber-400",
                  bg: "bg-amber-50 dark:bg-amber-950/30",
                  border: "border-amber-200 dark:border-amber-800/40",
                },
                {
                  label: "Worst loss",
                  value: biggestLoss || "—",
                  color: "text-orange-600 dark:text-orange-400",
                  bg: "bg-orange-50 dark:bg-orange-950/30",
                  border: "border-orange-200 dark:border-orange-800/40",
                },
              ].map(({ label, value, color, bg, border = "border-border" }) => (
                <div
                  key={label}
                  className={`${bg} rounded-xl p-3.5 flex flex-col items-center gap-1 border ${border}`}
                >
                  <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── HISTORY VIEW ── */}
          {activeView === "history" && (
            <div className="p-5">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No flips yet.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Head to the Game tab and make your first flip.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {history.map((flip) => (
                    <div
                      key={flip.id}
                      className={`
                        flex items-center justify-between rounded-xl px-4 py-3
                        text-xs border transition-colors duration-150
                        ${flip.result === "win"
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <img src={TOKEN_IMG} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-foreground/80">
                          Bet <strong className="text-foreground">{flip.wager}</strong>
                          {" · "}chose{" "}
                          <strong className="text-foreground uppercase">{flip.choice}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm tabular-nums ${
                            flip.result === "win"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {flip.tokens_delta > 0 ? "+" : ""}
                          {flip.tokens_delta}
                        </span>
                        <span
                          className={`
                            text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-widest
                            ${flip.result === "win"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            }
                          `}
                        >
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

      <ActivityFeed currentUserId={user?.id} isAdmin={isAdmin} />
    </>
  );
}