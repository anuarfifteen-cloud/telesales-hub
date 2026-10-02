import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Play, Plus, Shield } from "lucide-react";
import { playClick, playWin, playLoss } from "@/lib/sounds";
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

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
const GAME_TYPE = "blackjack";

export default function Blackjack21Game({ user, onUserUpdate }) {
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const tokensRef = useRef(tokens);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  const [bet, setBet] = useState(5);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [revealHole, setRevealHole] = useState(false);
  const [phase, setPhase] = useState("bet"); // bet | player | dealer | resolve
  const [result, setResult] = useState(null); // { type, detail, delta }
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("game");
  const queryClient = useQueryClient();

  const maxBet = Math.max(1, tokens);
  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const draw = (d) => d.pop();

  // ── Round settlement ──────────────────────────────────────────────────
  const settle = async (type, detail, delta) => {
    setResult({ type, detail, delta });
    setPhase("resolve");
    playClick();
    try {
      await base44.auth.updateMe({ earlyAccessTokens: tokensRef.current + delta });
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: GAME_TYPE,
        wager: bet,
        result: type === "push" ? "push" : type === "win" ? "win" : "loss",
        tokens_delta: delta,
        detail,
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: userName,
        amount: delta,
        source: `Casino 21 — ${detail} (wagered ${bet})`,
        timestamp: new Date().toISOString(),
      });
      await onUserUpdate?.();
      queryClient.invalidateQueries({ queryKey: ["blackjack-history", user?.id] });
      if (delta > 0) playWin();
      else if (delta < 0) playLoss();
    } catch {
      toast.error("Couldn't save your round. Balance may be out of sync.");
    }
  };

  // ── Deal a fresh hand ─────────────────────────────────────────────────
  const handleDeal = async () => {
    if (busy) return;
    const b = Math.min(Math.max(Math.floor(bet), 1), maxBet);
    if (tokens < 1) { toast.error("Not enough tokens."); return; }
    if (b > tokens) { toast.error("Not enough tokens for that bet."); return; }
    setBusy(true);
    playClick();
    // Debit the bet immediately.
    await base44.auth.updateMe({ earlyAccessTokens: tokens - b });
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
        if (playerBJ && dealerBJ) await settle("push", "Push — both Blackjack", b);
        else if (playerBJ) await settle("win", "Blackjack!", b + Math.round(b * 1.5));
        else await settle("loss", "Dealer Blackjack", 0);
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
        await settle("loss", "Player bust", 0);
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
      if (isBust(dlFinal)) await settle("win", "Dealer bust", bet * 2);
      else if (dv > pv) await settle("loss", "Dealer wins", 0);
      else if (dv < pv) await settle("win", "You win", bet * 2);
      else await settle("push", "Push", bet);
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

  const adjustBet = (dir) => setBet((b) => Math.min(Math.max(b + dir, 1), maxBet));
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
          className="rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-4"
          style={{
            background:
              "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          }}
        >
          {/* Balance strip */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/70">Balance</span>
            <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30">
              <img src={TOKEN_IMG} alt="token" className="w-3.5 h-3.5 object-contain" />
              <span className="text-amber-300 font-bold text-sm tabular-nums">{tokens}</span>
            </div>
          </div>

          {/* Dealer hand */}
          <HandPanel
            title="DEALER"
            value={revealHole || phase === "resolve" ? handValue(dealer) : dealer[0]?.value}
            cards={dealer}
            revealHole={revealHole}
          />

          {/* Player hand */}
          <HandPanel title="PLAYER" value={handValue(player)} cards={player} />

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
                <p className="text-sm font-bold tabular-nums">
                  {result.delta > 0 ? `+${result.delta}` : result.delta < 0 ? `${result.delta}` : "Refunded"}{" "}
                  <img src={TOKEN_IMG} alt="" className="inline w-3 h-3 object-contain align-middle" />
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
              <BetBar bet={bet} maxBet={maxBet} onSet={setBet} onAdjust={adjustBet} tokens={tokens} />
              <button
                onClick={handleDeal}
                disabled={busy || tokens < 1}
                className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-emerald-700/60 text-emerald-100 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
              >
                <Play className="inline mr-1 w-4 h-4" /> Deal
              </button>
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
    </div>
  );
}

// ── Glassmorphism hand panel ───────────────────────────────────────────
function HandPanel({ title, value, cards, revealHole = true }) {
  return (
    <div
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
              faceDown={title === "DEALER" && i === 1 && !revealHole}
              delay={i * 0.08}
              isNew
            />
          ))}
        </AnimatePresence>
        {cards.length === 0 && <span className="text-emerald-100/30 text-xs self-center">—</span>}
      </div>
    </div>
  );
}

// ── Bet slider with arrows + MAX ───────────────────────────────────────
function BetBar({ bet, maxBet, onSet, onAdjust, tokens }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-1)}
          disabled={bet <= 1 || tokens < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-300 font-black disabled:opacity-30"
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
          disabled={tokens < 1}
          className="flex-1 accent-amber-400"
        />
        <button
          onClick={() => onAdjust(1)}
          disabled={bet >= maxBet || tokens < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-300 font-black disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-300 font-black text-sm tabular-nums">
          <img src={TOKEN_IMG} alt="" className="w-3.5 h-3.5 object-contain" />
          {bet} TOKENS
        </span>
        <button
          onClick={() => onSet(maxBet)}
          disabled={tokens < 1}
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          MAX
        </button>
      </div>
    </div>
  );
}