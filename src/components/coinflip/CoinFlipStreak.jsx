import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Coins, Flame, Trophy, Skull, RotateCcw } from "lucide-react";
import { playClick, playWin, playLoss } from "@/lib/sounds";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── tiny local synth (whoosh + tension sting) ────────────────────────────
let _ctx;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _ctx = new C();
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
};
const playWhoosh = () => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(620, t + 1.8);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 2);
};
const playTension = () => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t + i * 0.08);
    g.gain.setValueAtTime(0.001, t + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
    o.connect(g).connect(c.destination);
    o.start(t + i * 0.08);
    o.stop(t + i * 0.08 + 0.22);
  });
};

const STAKE = 2; // starting pot when a chain begins (1 token wagered)

export default function CoinFlipStreak({ user, onUserUpdate }) {
  const tokens = user?.earlyAccessTokens ?? 0;

  const [phase, setPhase] = useState("IDLE"); // IDLE | FLIPPING | TENSION | LOST
  const [currentPot, setCurrentPot] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [choice, setChoice] = useState(null); // 'heads' | 'tails'
  const [pickMode, setPickMode] = useState(false); // choosing H/T for a flip
  const [coinRot, setCoinRot] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const coinRotRef = useRef(0);

  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const logTx = async (amount, source) => {
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: userName,
      amount,
      source,
      timestamp: new Date().toISOString(),
    });
  };

  // ── start a new chain: wager 1 token, pot set to 2 ──────────────────────
  const startChain = async () => {
    if (busy) return;
    if (tokens < 1) {
      toast.error("You need at least 1 token to start a chain.");
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe({ earlyAccessTokens: tokens - 1 });
      await logTx(-1, "Coin Flip Entry — Double or Nothing");
      await onUserUpdate?.();
      setCurrentPot(STAKE);
      setCurrentStreak(0);
      setChoice(null);
      setOutcome(null);
      setPickMode(true);
      setPhase("IDLE");
      playClick();
    } catch {
      toast.error("Couldn't start the chain. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── run a 50/50 flip with 2s coin animation ─────────────────────────────
  const flip = async () => {
    if (busy || !choice) return;
    setBusy(true);
    setPickMode(false);
    setOutcome(null);
    setPhase("FLIPPING");
    playClick();
    playWhoosh();

    // strict 50/50
    const result = Math.random() < 0.5 ? "heads" : "tails";

    // land the coin on the outcome face (heads = 0°, tails = 180°)
    const desired = result === "heads" ? 0 : 180;
    let target = coinRotRef.current + 1800;
    const mod = ((target % 360) + 360) % 360;
    target += ((desired - mod + 360) % 360);
    coinRotRef.current = target;
    setCoinRot(target);

    await wait(2000);
    setOutcome(result);

    const won = result === choice;
    if (won) {
      const isFirstFlip = currentStreak === 0;
      const newPot = isFirstFlip ? currentPot : currentPot * 2;
      setCurrentPot(newPot);
      setCurrentStreak((s) => s + 1);
      setChoice(null);
      playWin();
      playTension();
      setPhase("TENSION");
    } else {
      setCurrentPot(0);
      setCurrentStreak(0);
      setChoice(null);
      playLoss();
      setPhase("LOST");
    }
    setBusy(false);
  };

  // ── cash out: add pot to tokens, reset to IDLE ──────────────────────────
  const collect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pot = currentPot;
      await base44.auth.updateMe({ earlyAccessTokens: tokens + pot });
      await logTx(pot, "Coin Flip Cashout");
      await onUserUpdate?.();
      toast.success(`Cashed out ${pot} tokens! 🪙`);
      setCurrentPot(0);
      setCurrentStreak(0);
      setChoice(null);
      setPickMode(false);
      setOutcome(null);
      setPhase("IDLE");
    } catch {
      toast.error("Cashout failed. Try again.");
      setBusy(false);
    }
  };

  // ── double down: keep pot, choose H/T for another flip ──────────────────
  const doubleDown = () => {
    if (busy) return;
    setChoice(null);
    setOutcome(null);
    setPickMode(true); // phase stays TENSION; user picks again
  };

  const resetLost = () => {
    setPhase("IDLE");
    setCurrentPot(0);
    setCurrentStreak(0);
    setChoice(null);
    setPickMode(false);
    setOutcome(null);
  };

  // streak fire / neon tiers
  const fireLevel = currentStreak >= 7 ? 3 : currentStreak >= 5 ? 2 : currentStreak >= 3 ? 1 : 0;

  const showStart = phase === "IDLE" && currentPot === 0;
  const showPick = pickMode && (phase === "IDLE" || phase === "TENSION");
  const showTension = phase === "TENSION" && !pickMode;
  const showFlipping = phase === "FLIPPING";

  return (
    <div className="w-full max-w-sm mx-auto">
      <style>{`
        .cf-coin-scene { perspective: 1000px; }
        .cf-coin {
          position: relative; width: 132px; height: 132px;
          transform-style: preserve-3d;
          transition: transform 2s cubic-bezier(.2,.75,.2,1);
          will-change: transform;
        }
        .cf-face {
          position: absolute; inset: 0; border-radius: 9999px;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 34px; letter-spacing: 1px;
        }
        .cf-back { transform: rotateY(180deg); }
        @keyframes cfPotGlow {
          0%,100% { text-shadow: 0 0 20px rgba(255,215,0,.55), 0 0 42px rgba(255,180,0,.28); }
          50%    { text-shadow: 0 0 30px rgba(255,215,0,.9),  0 0 62px rgba(255,150,0,.5); }
        }
        @keyframes cfFirePulse {
          0%,100% { box-shadow: 0 0 18px rgba(255,80,0,.45), inset 0 0 18px rgba(255,80,0,.22); }
          50%    { box-shadow: 0 0 38px rgba(255,120,0,.85), inset 0 0 30px rgba(255,80,0,.4); }
        }
        @keyframes cfNeonPulse {
          0%,100% { box-shadow: 0 0 20px rgba(255,0,140,.5), 0 0 42px rgba(0,230,200,.3); }
          50%    { box-shadow: 0 0 36px rgba(255,0,140,.9), 0 0 64px rgba(0,230,200,.5); }
        }
        @keyframes cfSadShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-9px); }
          40% { transform: translateX(9px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes cfFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .cf-anim-pot   { animation: cfPotGlow 1.4s ease-in-out infinite; }
        .cf-anim-fire1 { animation: cfFirePulse 1.1s ease-in-out infinite; }
        .cf-anim-fire2 { animation: cfFirePulse .8s ease-in-out infinite, cfNeonPulse 1.6s ease-in-out infinite; }
        .cf-anim-fire3 { animation: cfFirePulse .6s ease-in-out infinite, cfNeonPulse 1.1s ease-in-out infinite; }
        .cf-anim-float { animation: cfFloat 3.2s ease-in-out infinite; }
        .cf-sad { animation: cfSadShake .5s ease-in-out 2; }
      `}</style>

      {/* premium casino panel */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-emerald-950 via-gray-950 to-emerald-900 shadow-2xl shadow-emerald-900/60">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
              Double or Nothing
            </h2>
          </div>
          <span className="rounded-full border border-amber-400/30 bg-black/30 px-3 py-1 text-[11px] font-bold text-amber-200">
            🪙 {tokens} tokens
          </span>
        </div>

        {/* streak counter */}
        <div className="mt-3 flex justify-center">
          <div className={`flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest ${
            fireLevel > 0
              ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/50"
              : "bg-white/5 text-emerald-200/70 ring-1 ring-white/10"
          }`}>
            <Flame className={`h-3.5 w-3.5 ${fireLevel > 0 ? "text-orange-400 animate-pulse" : "text-emerald-400/60"}`} />
            Current Win Streak: {currentStreak}
          </div>
        </div>

        {/* 3D coin */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="cf-coin-scene">
            <div
              className={`cf-coin ${showFlipping ? "" : "cf-anim-float"}`}
              style={{ transform: `rotateY(${coinRot}deg)` }}
            >
              {/* heads (front) */}
              <div
                className="cf-face text-amber-600"
                style={{
                  background: "linear-gradient(135deg,#fff6d5 0%,#f7d774 35%,#d4af37 70%,#a37a29 100%)",
                  boxShadow: "inset 0 0 12px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.45)",
                  border: "3px solid #8a6a1f",
                }}
              >
                <span style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>H</span>
              </div>
              {/* tails (back) */}
              <div
                className="cf-face cf-back text-emerald-700"
                style={{
                  background: "linear-gradient(135deg,#eafff2 0%,#9de7be 35%,#34a06a 70%,#16553a 100%)",
                  boxShadow: "inset 0 0 12px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.45)",
                  border: "3px solid #0f3d2a",
                }}
              >
                <span style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>T</span>
              </div>
            </div>
          </div>

          {/* outcome / status line */}
          <div className="mt-4 h-5 text-center text-xs font-bold uppercase tracking-widest">
            {showFlipping ? (
              <span className="text-emerald-300/80 animate-pulse">Flipping…</span>
            ) : outcome ? (
              <span className={outcome === "heads" ? "text-amber-300" : "text-emerald-300"}>
                Landed: {outcome.toUpperCase()}
              </span>
            ) : (
              <span className="text-white/30">—</span>
            )}
          </div>
        </div>

        {/* action area */}
        <div className="px-5 pb-6">
          {/* START */}
          {showStart && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-center text-sm text-emerald-100/70">
                Wager <span className="font-black text-amber-300">1 token</span> to start a chain. Win to double your pot — cash out or risk it all.
              </p>
              <button
                onClick={startChain}
                disabled={busy || tokens < 1}
                className="w-full rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500 to-yellow-400 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 shadow-lg shadow-amber-500/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              >
                🎯 Start Chain (1 Token)
              </button>
              {tokens < 1 && (
                <p className="text-[11px] text-red-300/80">Not enough tokens to play.</p>
              )}
            </div>
          )}

          {/* PICK H/T (first flip or double down) */}
          {showPick && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm font-bold text-emerald-100/90">
                {currentStreak === 0 ? "Call it in the air" : "Risk it all — call it again"}
                {currentPot > 0 && (
                  <span className="block text-[11px] font-normal text-amber-200/70 mt-0.5">
                    Pot at stake: <span className="font-black text-amber-300">{currentPot}</span> 🪙
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["heads", "tails"].map((side) => (
                  <button
                    key={side}
                    onClick={() => setChoice(side)}
                    className={`rounded-xl border py-3 text-sm font-black uppercase tracking-widest transition ${
                      choice === side
                        ? "border-amber-400 bg-amber-500/25 text-amber-200 ring-2 ring-amber-400/60"
                        : "border-white/10 bg-white/5 text-emerald-100/70 hover:bg-white/10"
                    }`}
                  >
                    {side === "heads" ? "👑 Heads" : "🏛️ Tails"}
                  </button>
                ))}
              </div>
              <button
                onClick={flip}
                disabled={!choice || busy}
                className="w-full rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-green-400 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              >
                🎲 Flip It
              </button>
            </div>
          )}

          {/* FLIPPING	wait state */}
          {showFlipping && (
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300/60 animate-pulse">
                Hold your breath…
              </span>
            </div>
          )}

          {/* TENSION — cash out or double down */}
          {showTension && (
            <div className="flex flex-col gap-4">
              <div
                className={`relative mx-auto flex flex-col items-center rounded-2xl border border-amber-400/30 px-6 py-5 ${
                  fireLevel === 3 ? "cf-anim-fire3" :
                  fireLevel === 2 ? "cf-anim-fire2" :
                  fireLevel === 1 ? "cf-anim-fire1" : ""
                } bg-black/40`}
              >
                {fireLevel > 0 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">
                    {fireLevel >= 2 ? "🔥🔥" : "🔥"}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/60">Current Pot</span>
                <span className={`cf-anim-pot mt-1 text-6xl font-black tabular-nums text-amber-300`}>
                  {currentPot}
                </span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-amber-200/70">🪙 Tokens</span>
              </div>

              <button
                onClick={collect}
                disabled={busy}
                className="w-full rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500 to-green-400 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              >
                <Trophy className="mr-1 inline h-4 w-4" /> 🟢 Take Profit ({currentPot} Tokens)
              </button>
              <button
                onClick={doubleDown}
                disabled={busy}
                className="w-full rounded-xl border border-red-500/50 bg-gradient-to-r from-red-600 to-rose-500 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              >
                🔴 Double Down (Risk it All)
              </button>
            </div>
          )}

          {/* LOST — wiped out */}
          {phase === "LOST" && (
            <div className="cf-sad flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 ring-1 ring-red-500/40">
                <Skull className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-xl font-black uppercase tracking-widest text-red-400">Wiped Out</p>
              <p className="text-center text-sm text-red-200/70">The pot is gone. The house takes it all.</p>
              <button
                onClick={resetLost}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-bold uppercase tracking-widest text-emerald-100 transition hover:bg-white/10"
              >
                <RotateCcw className="mr-1 inline h-4 w-4" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}