import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Play, Plus, Shield } from "lucide-react";
import {
  playClink,
  playCardSlide,
  playWinFanfare,
  playPush,
  playLoss,
} from "@/lib/sounds";
import {
  createDeck,
  shuffle,
  handValue,
  isBlackjack,
  isBust,
} from "./blackjackDeck";
import HandPanel from "./HandPanel";
import BlackjackStats from "./BlackjackStats";
import BlackjackHistory from "./BlackjackHistory";
import ChipCashierModal from "./ChipCashierModal";
import MiniChipIcon from "./MiniChipIcon";

const GAME_TYPE = "blackjack";

export default function Blackjack21Game({ user, onUserUpdate }) {
  const chips = Number(user?.casinoChips) || 0;
  const chipsRef = useRef(chips);
  useEffect(() => {
    chipsRef.current = chips;
  }, [chips]);

  const [bet, setBet] = useState(5);
  const [committedBet, setCommittedBet] = useState(0);
  const [showCashier, setShowCashier] = useState(false);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [ai, setAi] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [revealHole, setRevealHole] = useState(false);
  const [phase, setPhase] = useState("bet"); // bet | player | dealer | resolve
  const [result, setResult] = useState(null); // { type, detail, chipPayout, bet }
  const [aiResult, setAiResult] = useState(null); // { type, detail } — display only
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("game");
  const [flash, setFlash] = useState(null);
  const queryClient = useQueryClient();

  const maxBet = Math.max(1, chips);
  const draw = (d) => d.pop();

  const burstConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.4 },
        colors: ["#d4af37", "#fef1c9", "#10b981", "#34d399"],
      });
      setTimeout(
        () =>
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.5 },
            colors: ["#d4af37", "#34d399"],
          }),
        150
      );
    } catch {}
  };

  // ── Round settlement (chip-based; no token movement on settle) ──────
  const settle = async (type, detail, chipPayout) => {
    setResult({ type, detail, chipPayout, bet: committedBet });
    setPhase("resolve");
    try {
      const updates = {};
      if (chipPayout > 0) updates.casinoChips = chipsRef.current + chipPayout;
      if (Object.keys(updates).length) await base44.auth.updateMe(updates);
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: GAME_TYPE,
        wager: committedBet,
        result: type === "push" ? "push" : type === "win" ? "win" : "loss",
        tokens_delta: 0,
        detail,
      });
      await onUserUpdate?.();
      queryClient.invalidateQueries({ queryKey: ["blackjack-history", user?.id] });
      if (type === "win") {
        playWinFanfare();
        setFlash("win");
        burstConfetti();
        setTimeout(() => setFlash(null), 600);
      } else if (type === "push") {
        playPush();
      } else {
        playLoss();
        setFlash("loss");
        setTimeout(() => setFlash(null), 600);
      }
    } catch {
      toast.error("Couldn't save your round. Balance may be out of sync.");
    }
  };

  // ── Deal a fresh hand (player + AI + dealer) ────────────────────────
  const handleDeal = async () => {
    if (busy) return;
    const b = Math.min(Math.max(Math.floor(bet), 1), maxBet);
    if (chips < 1) return;
    if (b > chips) {
      toast.error("Not enough chips for that bet.");
      return;
    }
    setBusy(true);
    playClink();
    setCommittedBet(b);
    await base44.auth.updateMe({ casinoChips: chips - b });
    await onUserUpdate?.();

    const d = shuffle(createDeck());
    const p = [draw(d), draw(d)];
    const a = [draw(d), draw(d)];
    const dl = [draw(d), draw(d)];
    setDeck(d);
    setPlayer(p);
    setAi(a);
    setDealer(dl);
    setRevealHole(false);
    setResult(null);
    setAiResult(null);
    setPhase("player");
    setBusy(false);

    [0, 120, 240, 360, 480, 600].forEach((t) => setTimeout(playCardSlide, t));

    // Naturals: player blackjack, or dealer ace/ten up showing blackjack.
    const playerBJ = isBlackjack(p);
    const upIsTenish = dl[0].value === 11 || dl[0].value === 10;
    const dealerBJ = isBlackjack(dl);
    if (playerBJ || (upIsTenish && dealerBJ)) {
      setTimeout(async () => {
        setRevealHole(true);
        playCardSlide();
        // AI plays out for display even on a natural resolve.
        await playAI(d);
        if (playerBJ && dealerBJ) await settle("push", "Push — both Blackjack", b);
        else if (playerBJ) await settle("win", "Blackjack!", Math.round(b * 2.5));
        else await settle("loss", "Dealer Blackjack", 0);
      }, 800);
    }
  };

  // ── Hit (user only) ─────────────────────────────────────────────────
  const handleHit = () => {
    if (busy || phase !== "player") return;
    setBusy(true);
    playCardSlide();
    const d = [...deck];
    const p = [...player, draw(d)];
    setDeck(d);
    setPlayer(p);
    setBusy(false);
    if (isBust(p)) {
      setTimeout(async () => {
        setRevealHole(true);
        // AI still plays out for display, then settle the user's bust.
        await playAI(d);
        await settle("loss", "Player bust", 0);
      }, 500);
    }
  };

  // ── AI auto-play: hit below 17, stand on 17+ (display only) ─────────
  const playAI = async (d) => {
    let a = [...ai];
    while (handValue(a) < 17) {
      await new Promise((r) => setTimeout(r, 380));
      a = [...a, draw(d)];
      setAi(a);
      setDeck([...d]);
      playCardSlide();
    }
    return a;
  };

  // ── Stand → AI plays, then dealer plays, then settle ────────────────
  const handleStand = async () => {
    if (busy || phase !== "player") return;
    setPhase("dealer");
    setRevealHole(true);
    playCardSlide();
    let d = [...deck];
    let dl = [...dealer];

    // AI plays out first (display only).
    const aiFinal = await playAI(d);

    // Dealer stands on all 17s.
    while (handValue(dl) < 17) {
      await new Promise((r) => setTimeout(r, 420));
      dl = [...dl, draw(d)];
      d = [...d];
      setDealer(dl);
      setDeck(d);
      playCardSlide();
    }

    // User result vs dealer.
    const pv = handValue(player);
    const dv = handValue(dl);
    let userType, userDetail, chipPayout;
    if (isBust(dl)) {
      userType = "win";
      userDetail = "Dealer bust";
      chipPayout = committedBet * 2;
    } else if (dv > pv) {
      userType = "loss";
      userDetail = "Dealer wins";
      chipPayout = 0;
    } else if (dv < pv) {
      userType = "win";
      userDetail = "You win";
      chipPayout = committedBet * 2;
    } else {
      userType = "push";
      userDetail = "Push";
      chipPayout = committedBet;
    }

    // AI result (display only).
    const av = handValue(aiFinal);
    let aiRes;
    if (isBust(aiFinal)) aiRes = { type: "loss", detail: "AI bust" };
    else if (isBust(dl)) aiRes = { type: "win", detail: "AI beat dealer" };
    else if (av > dv) aiRes = { type: "win", detail: "AI beat dealer" };
    else if (av < dv) aiRes = { type: "loss", detail: "AI lost to dealer" };
    else aiRes = { type: "push", detail: "AI push" };
    setAiResult(aiRes);

    await settle(userType, userDetail, chipPayout);
  };

  const newRound = () => {
    setPlayer([]);
    setAi([]);
    setDealer([]);
    setDeck([]);
    setRevealHole(false);
    setResult(null);
    setAiResult(null);
    setCommittedBet(0);
    setPhase("bet");
  };

  const adjustBet = (dir) => {
    setBet((b) => Math.min(Math.max(b + dir, 1), maxBet));
    playClink();
  };
  const inPlay = phase === "player" || phase === "dealer";

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Shared Game / Stats / History tab strip */}
      <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded-t-2xl">
        {[
          ["game", "🎮 Game"],
          ["stats", "📊 Stats"],
          ["history", "📜 History"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
              view === id
                ? "bg-background text-foreground border border-border shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "game" && (
        <div
          className="relative rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-3 overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          }}
        >
          {/* Gold inner trim */}
          <div
            className="pointer-events-none absolute inset-0 rounded-b-2xl"
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)",
            }}
          />
          {/* Win / loss flash */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: flash === "win" ? 0.35 : 0.4 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    flash === "win"
                      ? "radial-gradient(circle, rgba(16,185,129,0.5), transparent 70%)"
                      : "radial-gradient(circle, rgba(244,63,94,0.5), transparent 70%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Balance strip — Cashier + chips */}
          <div className="relative flex items-center justify-between gap-2">
            <button
              onClick={() => setShowCashier(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 border border-amber-300 text-emerald-950 text-[11px] font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(212,175,55,0.4)] hover:brightness-105 transition"
            >
              <MiniChipIcon size={14} /> Cashier
            </button>
            <div
              className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30"
              title="Blackjack 21 chips — betting currency & winnings"
            >
              <MiniChipIcon size={14} />
              <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
            </div>
          </div>

          {/* Felt plaque */}
          <div className="relative text-center -mt-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
              Win pays 2× chips · cash out in the Cashier
            </span>
          </div>

          {/* Committed pot during play — single chip + total win return */}
          {inPlay && committedBet > 0 && (
            <div className="relative flex justify-center -mt-1 -mb-1">
              <div className="flex items-center gap-1.5">
                <MiniChipIcon size={22} />
                <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
                  {committedBet * 2}
                </span>
              </div>
            </div>
          )}

          {/* Dealer seat — full width on top (cards hidden until reveal) */}
          <HandPanel
            title="DEALER"
            value={revealHole || phase === "resolve" ? handValue(dealer) : "?"}
            cards={dealer}
            revealHole={revealHole}
          />

          {/* Player 2 (AI, left) + You (right) — side-by-side, fanned cards */}
          <div className="grid grid-cols-2 gap-3">
            <HandPanel
              title="PLAYER 2"
              tag="AI"
              value={ai.length ? handValue(ai) : "—"}
              cards={ai}
              compact
            />
            <HandPanel title="YOU" value={handValue(player)} cards={player} compact />
          </div>

          {/* Result overlay */}
          <AnimatePresence>
            {phase === "resolve" && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`relative text-center rounded-xl py-3 border ${
                  result.type === "win"
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                    : result.type === "push"
                    ? "bg-slate-500/20 border-slate-400/50 text-slate-100"
                    : "bg-rose-900/30 border-rose-500/50 text-rose-200"
                }`}
              >
                <p className="text-lg font-black uppercase tracking-widest">{result.detail}</p>
                <p className="text-sm font-bold tabular-nums flex items-center justify-center gap-1">
                  {result.type === "win" ? (
                    <>
                      +{result.chipPayout} <MiniChipIcon size={12} />
                    </>
                  ) : result.type === "push" ? (
                    <>
                      Refunded {result.bet} <MiniChipIcon size={12} />
                    </>
                  ) : (
                    <>
                      −{result.bet} <MiniChipIcon size={12} />
                    </>
                  )}
                </p>
                {aiResult && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
                    AI · {aiResult.detail}
                  </p>
                )}
                <button
                  onClick={newRound}
                  className="mt-2 px-4 py-1.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-widest"
                >
                  New Round
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bet + controls */}
          {phase === "bet" && (
            <>
              <BetBar bet={bet} maxBet={maxBet} onSet={setBet} onAdjust={adjustBet} chips={chips} />
              <button
                onClick={handleDeal}
                disabled={busy || chips < 1}
                className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-emerald-700/60 text-emerald-100 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
              >
                <Play className="inline mr-1 w-4 h-4" /> Deal
              </button>
              {chips < 1 && (
                <button
                  onClick={() => setShowCashier(true)}
                  className="w-full text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
                >
                  Open the Cashier to buy chips →
                </button>
              )}
            </>
          )}

          {inPlay && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleHit}
                disabled={busy || phase === "dealer"}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                style={{ background: "#d4af37" }}
              >
                <Plus className="inline mr-1 w-4 h-4" /> Hit
              </button>
              <button
                onClick={handleStand}
                disabled={busy || phase === "dealer"}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                style={{ background: "#d4af37" }}
              >
                <Shield className="inline mr-1 w-4 h-4" /> Stand
              </button>
            </div>
          )}
        </div>
      )}

      {view === "stats" && <BlackjackStats userId={user?.id} />}
      {view === "history" && <BlackjackHistory userId={user?.id} />}

      <ChipCashierModal
        user={user}
        open={showCashier}
        onClose={() => setShowCashier(false)}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
}

// ── Bet slider with arrows + MAX ───────────────────────────────────────
function BetBar({ bet, maxBet, onSet, onAdjust, chips }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-1)}
          disabled={bet <= 1 || chips < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ‹
        </button>
        <input
          type="range"
          min={1}
          max={maxBet}
          step={1}
          value={Math.min(bet, maxBet)}
          onChange={(e) => onSet(Number(e.target.value))}
          disabled={chips < 1}
          className="flex-1 accent-cyan-400"
        />
        <button
          onClick={() => onAdjust(1)}
          disabled={bet >= maxBet || chips < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
          <MiniChipIcon size={14} />
          {bet} CHIPS
        </span>
        <button
          onClick={() => onSet(maxBet)}
          disabled={chips < 1}
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          MAX
        </button>
      </div>
    </div>
  );
}