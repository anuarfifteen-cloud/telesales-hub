import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Loader2, Copy, Check, Sparkles, Ticket } from "lucide-react";
import { toast } from "sonner";
import { playWin, playLoss } from "@/lib/sounds";

const VOUCHER_COST = 2;
const SHAKE_DURATION = 2500;
const STORAGE_KEY = "blind_voucher_active_code";

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  const chunk = () =>
    Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
  return `BLIND-${chunk()}`;
}

function rollPrize() {
  const roll = Math.floor(Math.random() * 100) + 1; // 1-100
  if (roll === 1) return { type: "diamond", amount: 1 };
  return { type: "tokens", amount: Math.floor(Math.random() * 5) + 1 };
}

// Suspense hum during shake — local Web Audio
let suspenseCtx = null;
function playSuspenseStart() {
  try {
    suspenseCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = suspenseCtx.createOscillator();
    const gain = suspenseCtx.createGain();
    osc.connect(gain);
    gain.connect(suspenseCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, suspenseCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, suspenseCtx.currentTime + SHAKE_DURATION / 1000);
    gain.gain.setValueAtTime(0.06, suspenseCtx.currentTime);
    osc.start();
    osc._gain = gain;
    suspenseCtx._osc = osc;
  } catch (_) {}
}
function playSuspenseStop() {
  try {
    if (suspenseCtx && suspenseCtx._osc) {
      suspenseCtx._osc._gain.gain.exponentialRampToValueAtTime(0.001, suspenseCtx.currentTime + 0.15);
      suspenseCtx._osc.stop(suspenseCtx.currentTime + 0.16);
    }
    suspenseCtx = null;
  } catch (_) {}
}

function playJackpot() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const t = ac.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (_) {}
}

// ── Mock Recent Winners ───────────────────────────────────────────────────────
const MOCK_WINNERS = [
  { name: "Sarah", prize: "💎 VIP Diamond", time: "2m ago" },
  { name: "Mike", prize: "💎 VIP Diamond", time: "8m ago" },
  { name: "Aisyah", prize: "4 Tokens", time: "just now" },
  { name: "Faiz", prize: "3 Tokens", time: "1m ago" },
  { name: "Huda", prize: "💎 VIP Diamond", time: "15m ago" },
  { name: "Daniel", prize: "5 Tokens", time: "4m ago" },
];

// ── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ code, copied, onCopy, isShaking }) {
  return (
    <motion.div
      animate={
        isShaking
          ? { x: [0, -8, 8, -6, 6, -4, 4, 0], rotate: [0, -2, 2, -1, 1, 0] }
          : { x: 0, rotate: 0 }
      }
      transition={
        isShaking
          ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className="relative w-full rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 border-2 border-dashed border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.25)] px-5 py-4 overflow-hidden"
    >
      {/* shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <span className="text-3xl flex-shrink-0 drop-shadow-lg">🎟️</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-1">
            Mystery Voucher
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-white text-lg tracking-widest truncate">
              {code}
            </span>
            <button
              onClick={() => onCopy(code)}
              whileTap={{ scale: 0.9 }}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            >
              {copied === code ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </button>
          </div>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold text-emerald-300 bg-emerald-800/60 border border-emerald-500 px-2 py-0.5 rounded-full">
          Active
        </span>
      </div>
      {isShaking && (
        <div className="relative mt-3 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 animate-pulse">
            Decrypting…
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Jackpot Burst Modal ───────────────────────────────────────────────────────
function JackpotModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden"
          onClick={onClose}
        >
          {/* burst rays */}
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.05 }}
              className="absolute text-3xl"
              style={{
                left: "50%",
                top: "50%",
                transform: `rotate(${i * 22.5}deg) translateY(-120px)`,
              }}
            >
              ✨
            </motion.span>
          ))}

          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-3xl p-8 mx-6 text-center shadow-[0_0_60px_rgba(255,215,0,0.6)] border-4 border-yellow-300 z-10 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-7xl block drop-shadow-2xl"
            >
              💎
            </motion.span>
            <h2 className="font-black text-3xl text-white drop-shadow-lg mt-2 tracking-wider">
              JACKPOT!
            </h2>
            <p className="text-lg font-bold text-amber-50 mt-1">
              You won a 💎 VIP Diamond!
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-5 w-full py-3 rounded-xl bg-white text-amber-700 font-black text-sm uppercase tracking-widest shadow-lg hover:bg-amber-50 transition-colors"
            >
              Claim Prize 🎉
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Recent Winners Ticker ─────────────────────────────────────────────────────
function WinnersTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => (prev + 1) % MOCK_WINNERS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const w = MOCK_WINNERS[idx];
  const isDiamond = w.prize.includes("Diamond");

  return (
    <div className="w-full bg-slate-950/60 dark:bg-black/40 rounded-xl border border-emerald-500/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70 flex-shrink-0">
          🔴 LIVE
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className={`text-xs font-semibold truncate ${
              isDiamond
                ? "text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]"
                : "text-emerald-300/80"
            }`}
          >
            {w.name} just won {w.prize} · {w.time}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BlindVoucher({ user, onUserUpdate }) {
  const [activeCode, setActiveCode] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showJackpot, setShowJackpot] = useState(false);
  const shakeTimer = useRef(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const diamonds = user?.diamonds ?? 0;
  const canAfford = tokens >= VOUCHER_COST;
  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  // Load persisted code on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setActiveCode(saved);
    } catch (_) {}
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Step 1: Buy ──
  const handleBuyVoucher = async () => {
    if (!canAfford || purchasing || isShaking) return;
    setPurchasing(true);
    try {
      const code = generateCode();
      await base44.auth.updateMe({ earlyAccessTokens: tokens - VOUCHER_COST });
      await onUserUpdate();
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch (_) {}
      setActiveCode(code);
      setRedeemInput(code);
      toast.success(`Voucher purchased! Code: ${code}`);
    } catch (_) {
      toast.error("Purchase failed. Try again.");
    } finally {
      setPurchasing(false);
    }
  };

  // ── Step 2: Redeem ──
  const handleRedeem = async () => {
    const input = redeemInput.trim().toUpperCase();
    if (!input || redeemLoading || isShaking) return;

    if (!activeCode || input !== activeCode.toUpperCase()) {
      toast.error("Invalid or expired code.");
      playLoss();
      return;
    }

    setRedeemLoading(true);
    setIsShaking(true);
    playSuspenseStart();

    shakeTimer.current = setTimeout(async () => {
      playSuspenseStop();
      const prize = rollPrize();

      // Apply reward to user balance
      if (prize.type === "diamond") {
        await base44.auth.updateMe({ diamonds: diamonds + prize.amount });
      } else {
        await base44.auth.updateMe({ earlyAccessTokens: tokens + prize.amount });
      }
      await onUserUpdate();

      // Clear code from storage & state
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      setActiveCode(null);
      setRedeemInput("");
      setIsShaking(false);
      setRedeemLoading(false);

      // Reveal feedback
      if (prize.type === "diamond") {
        playJackpot();
        setShowJackpot(true);
      } else {
        playWin();
        toast.success(`Success! You received ${prize.amount} Token${prize.amount !== 1 ? "s" : ""}.`);
      }
    }, SHAKE_DURATION);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      playSuspenseStop();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <JackpotModal open={showJackpot} onClose={() => setShowJackpot(false)} />

      {/* Balance HUD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Tokens</span>
            <span className="text-2xl font-black text-foreground">{tokens}</span>
          </div>
          <span className="text-2xl">🪙</span>
        </div>
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Diamonds</span>
            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{diamonds}</span>
          </div>
          <span className="text-2xl">💎</span>
        </div>
      </div>

      {/* Buy Card */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-base text-foreground">Blind Voucher</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buy a mystery code for {VOUCHER_COST} tokens, then redeem it for a random prize —
              1–5 tokens, or a rare 💎 VIP Diamond (1% chance).
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
            {VOUCHER_COST} tokens
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBuyVoucher}
          disabled={!canAfford || purchasing || isShaking}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>🎁 Purchase Voucher ({VOUCHER_COST} Tokens)</>
          )}
        </motion.button>
        {!canAfford && (
          <p className="text-xs text-red-500 font-semibold text-center">
            Not enough tokens (need {VOUCHER_COST})
          </p>
        )}
      </div>

      {/* Active Ticket + Redeem */}
      {activeCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Your Active Voucher
          </p>
          <TicketCard
            code={activeCode}
            copied={copied}
            onCopy={handleCopy}
            isShaking={isShaking}
          />

          <motion.div
            animate={
              isShaking
                ? { x: [0, -4, 4, -2, 2, 0] }
                : { x: 0 }
            }
            transition={
              isShaking
                ? { duration: 0.3, repeat: Infinity }
                : { duration: 0.3 }
            }
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value)}
              placeholder="Enter your BLIND-XXXX code"
              disabled={isShaking}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-center font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRedeem}
              disabled={isShaking || redeemLoading || !redeemInput.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isShaking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Decrypting…
                </>
              ) : (
                <>redeem 🔓</>
              )}
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Sparkles className="w-8 h-8 text-emerald-400/40" />
          <p className="text-xs text-muted-foreground">
            No active voucher. Purchase one above to begin.
          </p>
        </div>
      )}

      {/* Recent Winners Ticker */}
      <WinnersTicker />
    </div>
  );
}