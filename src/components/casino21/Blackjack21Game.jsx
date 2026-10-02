import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Play, Plus, Shield } from "lucide-react";
import confetti from "canvas-confetti";
import { playClick, playWin, playLoss, playClink, playWinFanfare, playPush } from "@/lib/sounds";
import OdometerNumber from "./OdometerNumber";
import ChipStack from "./ChipStack";
import {
  createDeck,
  shuffle,
  handValue,
  isBlackjack,
  isBust,
} from "./blackjackDeck";
import PlayingCard from "./PlayingCard";
import BlackjackStats from "./BlackjackStats";
import BlackjackHistory from "./BlackjackHistory";
import ChipCashierModal from "./ChipCashierModal";
import MiniChipIcon from "./MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
const GAME_TYPE = "blackjack";

// Gold + emerald confetti burst from a DOM element's center (player hand panel).
const fireConfetti = (el) => {
  try {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (r.left + r.width / 2) / window.innerWidth;
    const y = (r.top + r.height / 2) / window.innerHeight;
    confetti({
      particleCount: 70,
      spread: 65,
      startVelocity: 38,
      origin: { x, y },
      colors: ["#d4af37", "#f5e6b8", "#10b981", "#34d399", "#ffffff"],
      scalar: 0.9,
      ticks: 110,
      disableForReducedMotion: true,
    });
  } catch {}
};

export default function Blackjack21Game({ user, onUserUpdate }) {
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const chips = Number(user?.casinoChips) || 0;
  const tokensRef = useRef(tokens);
  const chipsRef = useRef(chips);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  useEffect(() => { chipsRef.current = chips; }, [chips]);
  const [bet, setBet] = useState(5);
  const [showCashier, setShowCashier] = useState(false);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [revealHole, setRevealHole] = useState(false);
  const [phase, setPhase] = useState("bet"); // bet | player | dealer | resolve
  const [result, setResult] = useState(null); // { type, detail, delta }
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("game");
  const [winGlow, setWinGlow] = useState(false);
  const [lossFlash, setLossFlash] = useState(false);
  const [toss, setToss] = useState(null);
  const playerPanelRef = useRef(null);
  const queryClient = useQueryClient();

  const maxBet = Math.max(1, chips);
  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const draw = (d) => d.pop();

  // ── Round settlement (dual-currency: chips bet, tokens paid out) ──────
  // tokenPayout = tokens credited to earlyAccessTokens on a win/blackjack (0 otherwise)
  // chipRefund  = chips returned to casinoChips on a push (0 otherwise; loss keeps debited chips)
  const settle = async (type, detail, tokenPayout, chipRefund) => {
    setResult({ type, detail, tokenPayout, chipRefund, bet });
    setPhase("resolve");
    playClick();
    try {
      const updates = {};
      if (tokenPayout > 0) updates.earlyAccessTokens = tokensRef.current + tokenPayout;
      if (chipRefund > 0) updates.casinoChips = chipsRef.current + chipRefund;
      if (Object.keys(updates).length) await base44.auth.updateMe(updates);
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: GAME_TYPE,
        wager: bet,
        result: type === "push" ? "push" : type === "win" ? "win" : "loss",
        tokens_delta: tokenPayout,
        detail,
      });
      if (tokenPayout > 0) {
        await base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: userName,
          amount: tokenPayout,
          source: `Casino 21 — ${detail} (bet ${bet} chips → +${tokenPayout} tokens)`,
          timestamp: new Date().toISOString(),
        });
      }
      await onUserUpdate?.();
      queryClient.invalidateQueries({ queryKey: ["blackjack-history", user?.id] });
      if (type === "win") {
        playWinFanfare();
        setWinGlow(true);
        setTimeout(() => setWinGlow(false), 1200);
        fireConfetti(playerPanelRef.current);
      } else if (type === "loss") {
        playLoss();
        setLossFlash(true);
        setTimeout(() => setLossFlash(false), 700);
      } else {
        playPush();
      }
    } catch {
      toast.error("Couldn't save your round. Balance may be out of sync.");
    }
  };

  // ── Deal a fresh hand ─────────────────────────────────────────────────
  const handleDeal = async () => {
    if (busy) return;
    const b = Math.min(Math.max(Math.floor(bet), 1), maxBet);
    if (chips < 1) { return; }
    if (b > chips) { toast.error("Not enough chips for that bet."); return; }
    setBusy(true);
    playClink();
    setToss({ k: Date.now() });
    // Debit the bet from chips immediately.
    await base44.auth.updateMe({ casinoChips: chips - b });
    await onUserUpdate?.();

    const d = shuffle(createDeck());
    const p = [draw(d), draw(d)];
    const dl = [draw(d), draw(d)];
    setDeck(d);
    setPlayer(p);
    setDealer(dl);
    setRevealHole(false);
    setResult(null);
    setPhase("player");
    setBusy(false);

    // Check naturals: player blackjack, or dealer ace/ten up showing blackjack.
    const playerBJ = isBlackjack(p);
    const upIsTenish = dl[0].value === 11 || dl[0].value === 10;
    const dealerBJ = isBlackjack(dl);
    if (playerBJ || (upIsTenish && dealerBJ)) {
      // Reveal and settle immediately.
      setTimeout(async () => {
        setRevealHole(true);
        if (playerBJ && dealerBJ) await settle("push", "Push — both Blackjack", 0, b);
        else if (playerBJ) await settle("win", "Blackjack!", Math.round(b * 2.5), 0);
        else await settle("loss", "Dealer Blackjack", 0, 0);
      }, 650);
    }
  };

  // ── Hit ───────────────────────────────────────────────────────────────
  const handleHit = () => {
    if (busy || phase !== "player") return;
    setBusy(true);
    const d = [...deck];
    const p = [...player, draw(d)];
    setDeck(d);
    setPlayer(p);
    setBusy(false);
    if (isBust(p)) {
      setTimeout(async () => {
        setRevealHole(true);
        await settle("loss", "Player bust", 0, 0);
      }, 500);
    }
  };

  // ── Stand → dealer plays out ───────────────────────────────────────────
  const handleStand = async () => {
    if (busy || phase !== "player") return;
    setPhase("dealer");
    setRevealHole(true);
    playClick();
    let d = [...deck];
    let dl = [...dealer];
    // Dealer stands on all 17s (including soft 17).
    const step = async () => {
      while (handValue(dl) < 17) {
        await new Promise((r) => setTimeout(r, 420));
        dl = [...dl, draw(d)];
        d = [...d];
        setDealer(dl);
        setDeck(d);
      }
      finish(dl);
    };
    const finish = async (dlFinal) => {
      const pv = handValue(player);
      const dv = handValue(dlFinal);
      if (isBust(dlFinal)) await settle("win", "Dealer bust", bet * 2, 0);
      else if (dv > pv) await settle("loss", "Dealer wins", 0, 0);
      else if (dv < pv) await settle("win", "You win", bet * 2, 0);
      else await settle("push", "Push", 0, bet);
    };
    step();
  };

  // ── New round ──────────────────────────────────────────────────────────
  const newRound = () => {
    setPlayer([]);
    setDealer([]);
    setDeck([]);
    setRevealHole(false);
    setResult(null);
    setPhase("bet");
  };

  const adjustBet = (dir) => { playClink(); setBet((b) => Math.min(Math.max(b + dir, 1), maxBet)); };
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
          className="relative rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-4"
          style={{
            background:
              "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
            boxShadow: "inset 0 0 0 1.5px rgba(212,175,55,0.35)",
          }}
        >
          {/* Chip toss animation — flies from the chip balance pill to the felt */}
          <AnimatePresence>
            {toss && (
              <motion.div
                key={toss.k}
                className="pointer-events-none absolute z-20"
                style={{ right: 14, top: 10 }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                animate={{ x: -90, y: 130, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 180, damping: 11 }}
                onAnimationComplete={() => setToss(null)}
              >
                <MiniChipIcon size={30} />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Balance strip — Cashier + chips (bet) + tokens (payout) */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setShowCashier(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 border border-amber-300 text-emerald-950 text-[11px] font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(212,175,55,0.4)] hover:brightness-105 transition"
            >
              <MiniChipIcon size={14} /> Buy Chips
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30" title="Casino chips — betting currency">
                <MiniChipIcon size={14} />
                <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30" title="Tokens — payout currency">
                <img src={TOKEN_IMG} alt="token" className="w-3.5 h-3.5 object-contain" />
                <OdometerNumber value={tokens} className="text-amber-300 font-bold text-sm tabular-nums" />
              </div>
            </div>
          </div>

          {/* Rules plaque */}
          <div className="mx-auto -mt-1 mb-1 px-3 py-1 rounded-full border border-amber-400/40 bg-emerald-950/40 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/80 text-center">
            Blackjack Pays 3 to 2 · Dealer Stands on 17
          </div>

          {/* Dealer hand */}
          <HandPanel
            title="DEALER"
            value={revealHole || phase === "resolve" ? handValue(dealer) : dealer[0]?.value}
            cards={dealer}
            revealHole={revealHole}
          />

          {/* Player hand */}
          <HandPanel
            panelRef={playerPanelRef}
            title="PLAYER"
            value={handValue(player)}
            cards={player}
            glow={winGlow ? "win" : lossFlash ? "loss" : null}
          />

          {/* Result overlay */}
          <AnimatePresence>
            {phase === "resolve" && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center rounded-xl py-3 border ${
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
                    <>+{result.tokenPayout} <img src={TOKEN_IMG} alt="" className="inline w-3 h-3 object-contain align-middle" /></>
                  ) : result.type === "push" ? (
                    <>Refunded {result.bet} <MiniChipIcon size={12} /></>
                  ) : (
                    <>−{result.bet} <MiniChipIcon size={12} /></>
                  )}
                </p>
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
              <ChipStack bet={bet} />
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

// ── Glassmorphism hand panel ───────────────────────────────────────────
function HandPanel({ title, value, cards, revealHole = true, panelRef, glow = null }) {
  const glowShadow =
    glow === "win"
      ? "0 0 0 2px rgba(16,185,129,0.7), 0 0 22px rgba(16,185,129,0.45)"
      : glow === "loss"
      ? "0 0 0 2px rgba(244,63,94,0.6), 0 0 18px rgba(244,63,94,0.35)"
      : "0 0 0 0 transparent";
  return (
    <motion.div
      ref={panelRef}
      animate={{ boxShadow: glowShadow }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-3 border border-white/15"
      style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/80">{title}</span>
        <span className="text-sm font-black text-amber-300 tabular-nums">
          {value !== undefined && value !== null ? `${value}${title === "DEALER" && !revealHole ? "?" : ""}` : "—"}
        </span>
      </div>
      <div className="flex gap-2 items-start min-h-[5.5rem]">
        <AnimatePresence>
          {cards.map((c, i) => (
            <PlayingCard
              key={`${title}-${i}-${c.rank}${c.suit}`}
              card={c}
              delay={i * 0.15}
              isNew
              faceDown={title === "DEALER" && i === 1 && !revealHole}
            />
          ))}
        </AnimatePresence>
        {cards.length === 0 && <span className="text-emerald-100/30 text-xs self-center">—</span>}
      </div>
    </motion.div>
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
          onClick={() => { playClink(); onSet(maxBet); }}
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