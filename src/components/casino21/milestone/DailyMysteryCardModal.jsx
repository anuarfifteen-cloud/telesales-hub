import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Zap, Coins } from "lucide-react";
import {
  ensureDaily,
  revealMysteryCard,
  shuffleRewards,
} from "@/lib/dailyChallenges";
import { requestGoToRanked } from "@/lib/rankedNav";
import { RankedCardBack } from "./RankedPlayingCard";

// Reward display metadata: icon, label, sub-label, accent color and duration.
const REWARD_META = {
  surge_2x: {
    icon: Flame,
    label: "2× Rank Surge",
    sub: "30-Minute 2× Rank Boost",
    color: "#f43f5e",
    durationMs: 30 * 60 * 1000,
    pill: "🔥 2× Surge",
  },
  bet_cap_25: {
    icon: Zap,
    label: "High Roller Pass",
    sub: "20-Min 25-Chip Bet Cap",
    color: "#f59e0b",
    durationMs: 20 * 60 * 1000,
    pill: "⚡ Max Bet 25",
  },
  chips_100: {
    icon: Coins,
    label: "Direct Drop",
    sub: "+100 Chips Instantly",
    color: "#10b981",
    durationMs: 0,
    pill: null,
  },
};

function fmtMMSS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Single flip card ────────────────────────────────────────────────
// Face-down uses the Ranked ruby-red card back. On reveal the chosen card
// flips to a glowing reward face; the two unchosen cards flip to a dimmed
// reveal of what was behind them.
function MysteryCard({ index, reward, selected, revealed, onPick, busy }) {
  const meta = REWARD_META[reward.type];
  const Icon = meta.icon;
  const isChosen = selected === index;
  const isDim = revealed && !isChosen;
  const flipped = selected !== null;

  return (
    <button
      type="button"
      onClick={() => !flipped && !busy && onPick(index)}
      disabled={flipped || busy}
      className="relative w-24 h-36 sm:w-28 sm:h-40 flex-shrink-0 focus:outline-none"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Back (face-down) */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 10,
          }}
        >
          <RankedCardBack />
        </div>
        {/* Face (reward) */}
        <div
          className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center text-center px-1.5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 10,
            background:
              "linear-gradient(160deg, #1a1209 0%, #0c0a06 100%)",
            border: isChosen
              ? `1.5px solid ${meta.color}`
              : "1px solid rgba(212,175,55,0.25)",
            boxShadow: isChosen
              ? `0 0 18px ${meta.color}99, inset 0 0 12px ${meta.color}33`
              : "0 4px 10px rgba(0,0,0,0.4)",
            opacity: isDim ? 0.42 : 1,
            filter: isDim ? "grayscale(0.6)" : "none",
          }}
        >
          {/* gold inner trim */}
          <div
            className="absolute inset-1"
            style={{
              borderRadius: 7,
              border: "1px solid rgba(212,175,55,0.35)",
            }}
          />
          <div
            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1"
            style={{
              background: `${meta.color}22`,
              border: `1px solid ${meta.color}`,
              boxShadow: isChosen ? `0 0 10px ${meta.color}66` : "none",
            }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: meta.color }} />
          </div>
          <p
            className="relative text-[11px] sm:text-xs font-black uppercase tracking-wide leading-tight"
            style={{ color: meta.color, fontFamily: "Cinzel, serif" }}
          >
            {meta.label}
          </p>
          <p className="relative text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-amber-100/70 mt-0.5 leading-tight">
            {meta.sub}
          </p>
          {isDim && (
            <span className="relative mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
              Not yours
            </span>
          )}
        </div>
      </motion.div>
    </button>
  );
}

export default function DailyMysteryCardModal({ user, onUserUpdate }) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState([]);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expiry, setExpiry] = useState(0);

  // Live 1s tick for the post-reveal countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // First-launch trigger: load today's record; if the card is unopened, prompt.
  useEffect(() => {
    let active = true;
    (async () => {
      const d = await ensureDaily(user).catch(() => null);
      if (!active || !d) return;
      if (d.daily_mystery_card_status !== "revealed") {
        setLayout(shuffleRewards());
        setOpen(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handlePick = async (idx) => {
    if (busy || selected !== null) return;
    setBusy(true);
    setSelected(idx);
    const reward = layout[idx].type;
    const meta = REWARD_META[reward];
    try {
      await revealMysteryCard(user, idx, reward);
      if (meta.durationMs > 0) setExpiry(Date.now() + meta.durationMs);
      await onUserUpdate?.();
    } catch {
      /* ignore — the flip still plays */
    }
    // Let the 3D flip finish before showing the post-reveal CTA + countdown.
    setTimeout(() => setRevealed(true), 650);
    setBusy(false);
  };

  const dismiss = () => setOpen(false);
  const goRanked = () => {
    setOpen(false);
    requestGoToRanked();
  };

  const reward = selected !== null ? layout[selected]?.type : null;
  const meta = reward ? REWARD_META[reward] : null;
  const countdownMs = expiry ? Math.max(0, expiry - now) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(5,3,8,0.82)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm rounded-3xl border border-amber-400/40 p-5 flex flex-col items-center"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 55%), linear-gradient(160deg, #1a0f14 0%, #0a0608 100%)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.2)",
            }}
          >
            {/* gold inner trim */}
            <div
              className="pointer-events-none absolute inset-1.5 rounded-2xl"
              style={{ border: "1px solid rgba(212,175,55,0.25)" }}
            />

            {/* Close (only before a choice — once revealed, use the CTA/dismiss) */}
            {selected === null && (
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-rose-950/60 border border-amber-400/30 text-amber-200 flex items-center justify-center hover:bg-rose-900/60 transition z-10"
                title="Play later"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Headline + subtitle */}
            <div className="relative text-center mt-1">
              <h2
                className="text-lg font-black uppercase tracking-widest text-amber-300"
                style={{ fontFamily: "Cinzel, serif" }}
              >
                🃏 Daily Mystery Card
              </h2>
              <p className="mt-1 text-[11px] font-medium text-amber-100/70 leading-snug">
                {selected === null
                  ? "Choose your card for today. Rewards activate immediately upon reveal!"
                  : "Your reward is active — use it before the timer runs out!"}
              </p>
            </div>

            {/* Three face-down cards */}
            <div className="relative flex items-center justify-center gap-3 mt-5">
              {layout.map((rwd, i) => (
                <MysteryCard
                  key={i}
                  index={i}
                  reward={rwd}
                  selected={selected}
                  revealed={revealed}
                  onPick={handlePick}
                  busy={busy}
                />
              ))}
            </div>

            {/* Post-reveal: countdown + CTA */}
            <AnimatePresence>
              {revealed && meta && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative w-full mt-5 flex flex-col items-center gap-2"
                >
                  {meta.durationMs > 0 ? (
                    <div
                      className="w-full rounded-xl border px-3 py-2 text-center"
                      style={{
                        borderColor: `${meta.color}66`,
                        background: `${meta.color}14`,
                      }}
                    >
                      <p
                        className="text-xs font-black uppercase tracking-widest"
                        style={{ color: meta.color }}
                      >
                        {meta.pill} Active
                      </p>
                      <p className="mt-0.5 text-xl font-black tabular-nums text-amber-100">
                        {fmtMMSS(countdownMs)} remaining
                      </p>
                    </div>
                  ) : (
                    <div
                      className="w-full rounded-xl border px-3 py-2 text-center"
                      style={{
                        borderColor: `${meta.color}66`,
                        background: `${meta.color}14`,
                      }}
                    >
                      <p
                        className="text-xs font-black uppercase tracking-widest"
                        style={{ color: meta.color }}
                      >
                        +100 Chips Credited!
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-100/60">
                        Does not count toward 🏆RANK
                      </p>
                    </div>
                  )}

                  <button
                    onClick={goRanked}
                    className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 transition hover:brightness-105"
                    style={{
                      background: "linear-gradient(135deg, #d4af37 0%, #fef1c9 100%)",
                      boxShadow: "0 6px 18px rgba(212,175,55,0.35)",
                    }}
                  >
                    🏆 GO TO RANKED NOW
                  </button>
                  <button
                    onClick={dismiss}
                    className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 hover:text-amber-200/80 transition"
                  >
                    Play later (timer will keep running)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pre-reveal dismiss hint */}
            {selected === null && (
              <p className="relative mt-4 text-[10px] font-bold uppercase tracking-widest text-amber-200/40 text-center">
                Tap a card to reveal today's reward
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}