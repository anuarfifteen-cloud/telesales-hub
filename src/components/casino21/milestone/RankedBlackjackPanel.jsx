import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Play, Plus, Shield, X } from "lucide-react";
import { playClink, playWinFanfare, playPush, playLoss } from "@/lib/sounds";
import { logChipMovement } from "@/lib/chipLog";
import {
  createDeck,
  shuffle,
  handValue,
  isBlackjack,
  isBust,
} from "../blackjackDeck";
import HandPanel from "../HandPanel";
import MiniChipIcon from "../MiniChipIcon";
import RankedPlayingCard from "./RankedPlayingCard";

// Ranked Blackjack — a focused, self-contained 1-v-1 table that lives inside the
// 🏆RANK tab. Wagers are strictly 1–10 casinoChips (capped to the player's
// available balance). Only winning payouts from hands played here feed the
// seasonal milestone score via the `recordWin` callback.
//
// Payouts stay in chips (whole numbers for any 1–10 wager):
//   Win (1:1)         → wager * 2 returned
//   Natural BJ (3:2)  → floor(wager * 2.5) returned
//   Push              → wager refunded
//   Loss              → nothing (wager already deducted at deal)
const RANKED_MIN = 1;
const RANKED_MAX = 10;
const DEALER_DRAW_MS = 550;

export default function RankedBlackjackPanel({ user, onUserUpdate, recordWin, onClose }) {
  const chips = Number(user?.casinoChips) || 0;
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Player";

  // The highest legal wager: never more than 10, never more than the balance.
  const maxBet = Math.min(RANKED_MAX, Math.max(chips, RANKED_MIN));

  const [bet, setBet] = useState(RANKED_MIN);
  const [committedBet, setCommittedBet] = useState(0);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [revealHole, setRevealHole] = useState(false);
  const [phase, setPhase] = useState("bet"); // bet | player | dealer | resolve
  const [result, setResult] = useState(null); // { type, detail, natural, chipPayout, chipRefund, bet }
  const [busy, setBusy] = useState(false);
  const [dealerThinking, setDealerThinking] = useState(false);

  const draw = (d) => d.pop();
  const inPlay = phase === "player" || phase === "dealer";
  const shownBet = Math.min(Math.max(bet, RANKED_MIN), maxBet);

  const burstConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.4 },
        colors: ["#d4af37", "#fef1c9", "#10b981", "#34d399"],
      });
    } catch {}
  };

  // Player vs Dealer only. Dealer stands on all 17 (classic rules).
  const resolveRound = (playerHand, dealerHand) => {
    const pVal = handValue(playerHand);
    const dVal = handValue(dealerHand);
    const pBust = pVal > 21;
    const dBust = dVal > 21;
    const pNatural = isBlackjack(playerHand);
    const dNatural = isBlackjack(dealerHand);

    if (pBust) return { type: "loss", detail: "BUST — DEALER WINS", natural: false };
    if (pNatural && dNatural) return { type: "push", detail: "PUSH — BOTH BLACKJACK", natural: false };
    if (pNatural) return { type: "win", detail: "BLACKJACK! YOU WIN", natural: true };
    if (dNatural) return { type: "loss", detail: "DEALER BLACKJACK", natural: false };
    if (dBust) return { type: "win", detail: "DEALER BUST — YOU WIN", natural: false };
    if (pVal > dVal) return { type: "win", detail: "YOU WIN", natural: false };
    if (pVal === dVal) return { type: "push", detail: "PUSH", natural: false };
    return { type: "loss", detail: "DEALER WINS", natural: false };
  };

  const settle = async (res, wagerOverride) => {
    const wager = wagerOverride ?? committedBet;
    const chipPayout =
      res.type === "win"
        ? res.natural
          ? Math.floor(wager * 2.5)
          : wager * 2
        : 0;
    const chipRefund = res.type === "push" ? wager : 0;
    setResult({ ...res, chipPayout, chipRefund, bet: wager });
    setPhase("resolve");
    if (res.type === "win") setTimeout(burstConfetti, 130);
    try {
      const fresh = await base44.auth.me();
      const chipBalance = Number(fresh?.casinoChips) || 0;
      const credit = chipPayout + chipRefund;
      if (credit > 0) await base44.auth.updateMe({ casinoChips: chipBalance + credit });
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: "blackjack",
        wager,
        result: res.type === "push" ? "push" : res.type === "win" ? "win" : "loss",
        tokens_delta: 0,
        detail: `Ranked — ${res.detail}`,
      });
      if (res.type === "win") {
        await base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: displayName,
          amount: 0,
          source: `Ranked Blackjack Win (${chipPayout} chips toward 🏆RANK)`,
          timestamp: new Date().toISOString(),
        });
      }
      await onUserUpdate?.();
      logChipMovement({
        user,
        action_type: res.type,
        amount: credit,
        balance_after: chipBalance + credit,
        chips_won: chipPayout || null,
        detail: `Ranked Blackjack — ${res.detail}`,
      });
      // 🏆RANK: only Ranked wins feed the seasonal score.
      if (res.type === "win" && recordWin) recordWin(chipPayout);
      if (res.type === "win") playWinFanfare();
      else if (res.type === "push") playPush();
      else playLoss();
    } catch {
      toast.error("Couldn't save your ranked round. Balance may be out of sync.");
    }
  };

  const playDealer = async (startDeck, startDealer) => {
    let d = [...startDeck];
    let dl = [...startDealer];
    while (handValue(dl) < 17) {
      setDealerThinking(true);
      await new Promise((r) => setTimeout(r, DEALER_DRAW_MS));
      setDealerThinking(false);
      dl = [...dl, draw(d)];
      d = [...d];
      setDealer(dl);
      setDeck(d);
    }
    return { deck: d, dealer: dl };
  };

  const handleDeal = async () => {
    if (busy) return;
    if (chips < RANKED_MIN) {
      toast.error(`You need at least ${RANKED_MIN} chip to play Ranked.`);
      return;
    }
    setBusy(true);
    playClink();
    const fresh = await base44.auth.me();
    const balance = Number(fresh?.casinoChips) || 0;
    const b = Math.min(shownBet, balance, RANKED_MAX);
    if (b < RANKED_MIN) {
      toast.error(`You need at least ${RANKED_MIN} chip to play Ranked.`);
      setBusy(false);
      await onUserUpdate?.();
      return;
    }
    setCommittedBet(b);
    await base44.auth.updateMe({ casinoChips: balance - b });
    await onUserUpdate?.();
    logChipMovement({
      user,
      action_type: "bet",
      amount: -b,
      balance_after: balance - b,
      detail: `Ranked Blackjack bet ${b}`,
    });

    const d = shuffle(createDeck());
    const p = [];
    const dl = [];
    setDeck([]);
    setPlayer([]);
    setDealer([]);
    setRevealHole(false);
    setResult(null);
    setPhase("player");

    for (const seat of ["p", "d", "p", "d"]) {
      await new Promise((r) => setTimeout(r, 200));
      const card = draw(d);
      if (seat === "p") {
        p.push(card);
        setPlayer([...p]);
      } else {
        dl.push(card);
        setDealer([...dl]);
      }
    }
    setDeck([...d]);
    setBusy(false);

    // Naturals: player blackjack or dealer ace/ten up showing blackjack.
    const playerBJ = isBlackjack(p);
    const upIsTenish = dl[0].value === 11 || dl[0].value === 10;
    const dealerBJ = isBlackjack(dl);
    if (playerBJ || (upIsTenish && dealerBJ)) {
      setTimeout(async () => {
        setRevealHole(true);
        const res = resolveRound(p, dl);
        await settle(res, b);
      }, 700);
    }
  };

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
        setPhase("dealer");
        const { dealer: dlFinal } = await playDealer(d, dealer);
        setRevealHole(true);
        const res = resolveRound(p, dlFinal);
        await settle(res);
      }, 400);
    }
  };

  const handleStand = async () => {
    if (busy || phase !== "player") return;
    setPhase("dealer");
    const { dealer: dlFinal } = await playDealer(deck, dealer);
    setRevealHole(true);
    const res = resolveRound(player, dlFinal);
    await settle(res);
  };

  const newRound = () => {
    setPlayer([]);
    setDealer([]);
    setDeck([]);
    setRevealHole(false);
    setResult(null);
    setDealerThinking(false);
    setCommittedBet(0);
    setPhase("bet");
  };

  const adjustBet = (delta) => {
    setBet((b) => Math.min(Math.max(b + delta, RANKED_MIN), Math.max(maxBet, RANKED_MIN)));
    playClink();
  };

  return (
    <div
      className="ranked-table relative rounded-2xl border border-amber-400/40 p-3 flex flex-col gap-3 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
          ⚔️ RANKED TABLE · 1–10 CHIPS
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-full bg-emerald-950/50 border border-amber-400/30 text-amber-200 flex items-center justify-center hover:bg-emerald-950/70 transition"
            title="Close ranked table"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Balance */}
      <div className="relative flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30"
          title="Your Blackjack chips"
        >
          <MiniChipIcon size={14} />
          <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
        </div>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-amber-200/60">
          Wins count toward 🏆RANK
        </span>
      </div>

      {/* Dealer */}
      <HandPanel
        title="DEALER"
        value={revealHole || phase === "resolve" ? handValue(dealer) : "?"}
        cards={dealer}
        revealHole={revealHole}
        overlap={40}
        cardComponent={RankedPlayingCard}
      />
      {dealerThinking && (
        <div className="relative flex justify-center -mt-1 mb-1">
          <span className="text-amber-200/90 text-xs font-bold animate-pulse">🤔 Dealer thinking...</span>
        </div>
      )}

      {/* Player */}
      <HandPanel title="YOU" value={handValue(player)} cards={player} cardComponent={RankedPlayingCard} />

      {/* Inline result banner */}
      {phase === "resolve" && result && (
        <div
          className="relative rounded-2xl border p-3 text-center"
          style={{
            background:
              result.type === "win"
                ? "rgba(212,175,55,0.14)"
                : result.type === "push"
                ? "rgba(148,163,184,0.14)"
                : "rgba(244,63,94,0.14)",
            borderColor:
              result.type === "win"
                ? "rgba(212,175,55,0.6)"
                : result.type === "push"
                ? "rgba(148,163,184,0.6)"
                : "rgba(244,63,94,0.6)",
          }}
        >
          <p
            className={`text-sm font-black uppercase tracking-widest ${
              result.type === "win"
                ? "text-amber-300"
                : result.type === "push"
                ? "text-slate-200"
                : "text-rose-300"
            }`}
          >
            {result.detail}
          </p>
          <p className="mt-1 text-[11px] font-bold text-emerald-100/80">
            {result.type === "win" ? (
              <>+{result.chipPayout} chips added to 🏆RANK</>
            ) : result.type === "push" ? (
              <>{result.chipRefund} chips returned</>
            ) : (
              <>−{result.bet} chips lost</>
            )}
          </p>
          <button
            onClick={newRound}
            className="mt-2.5 w-full py-2 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-widest border border-amber-300 hover:brightness-105 transition"
          >
            New Ranked Hand
          </button>
        </div>
      )}

      {/* Bet + controls */}
      {phase === "bet" && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustBet(-1)}
                disabled={shownBet <= RANKED_MIN}
                className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
              >
                ‹
              </button>
              <input
                type="range"
                min={RANKED_MIN}
                max={Math.max(maxBet, RANKED_MIN)}
                step={1}
                value={shownBet}
                onChange={(e) => setBet(Number(e.target.value))}
                disabled={chips < RANKED_MIN}
                className="flex-1 accent-cyan-400"
              />
              <button
                onClick={() => adjustBet(1)}
                disabled={shownBet >= maxBet}
                className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
              >
                ›
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
                <MiniChipIcon size={14} />
                {shownBet} CHIPS
              </span>
              <button
                onClick={() => setBet(maxBet)}
                disabled={chips < RANKED_MIN}
                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
                style={{ background: "#d4af37" }}
              >
                MAX
              </button>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60 text-center">
              Ranked wagers {RANKED_MIN}–{RANKED_MAX} chips
            </p>
          </div>
          <button
            onClick={handleDeal}
            disabled={busy || chips < RANKED_MIN}
            className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-emerald-700/60 text-emerald-100 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
          >
            <Play className="inline mr-1 w-4 h-4" /> Deal Ranked
          </button>
          {chips < RANKED_MIN && (
            <p className="w-full text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/80">
              You need chips to play Ranked — top up in the Cashier.
            </p>
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
  );
}