import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { revealBonusMysteryCard, shuffleRewards } from "@/lib/dailyChallenges";
import { requestGoToRanked } from "@/lib/rankedNav";
import { REWARD_META, fmtMMSS, MysteryCardFlip } from "./mysteryCardKit";

// Bonus Mystery Card popup. Opened ONLY by the bonus button in the Daily
// Missions panel, which itself only unlocks once every daily mission has been
// claimed. The chosen card is persisted by revealBonusMysteryCard, so reopening
// today can never reroll the reward or pay it twice.
export default function BonusMysteryCardModal({ user, open, onClose, onUserUpdate }) {
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

  // Fresh fan of three cards each time the player opens the popup.
  useEffect(() => {
    if (!open) return;
    setLayout(shuffleRewards());
    setSelected(null);
    setRevealed(false);
    setExpiry(0);
    setBusy(false);
  }, [open]);

  const handlePick = async (idx) => {
    if (busy || selected !== null) return;
    setBusy(true);
    setSelected(idx);
    const reward = layout[idx].type;
    const meta = REWARD_META[reward];
    try {
      await revealBonusMysteryCard(user, idx, reward);
      if (meta.durationMs > 0) setExpiry(Date.now() + meta.durationMs);
      await onUserUpdate?.();
    } catch {
      /* ignore — the flip still plays */
    }
    setTimeout(() => setRevealed(true), 650);
    setBusy(false);
  };

  const goRanked = () => {
    onClose?.();
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
            className="relative w-full max-w-sm rounded-3xl p-5 flex flex-col items-center"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.14) 0%, transparent 55%), linear-gradient(160deg, #101a24 0%, #070c10 100%)",
              border: "1px solid rgba(56,189,248,0.45)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(56,189,248,0.25)",
            }}
          >
            {/* inner trim */}
            <div
              className="pointer-events-none absolute inset-1.5 rounded-2xl"
              style={{ border: "1px solid rgba(212,175,55,0.22)" }}
            />

            {selected === null && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-rose-950/60 border border-amber-400/30 text-amber-200 flex items-center justify-center hover:bg-rose-900/60 transition z-10"
                title="Play later"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="relative text-center mt-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]"
                style={{
                  background: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.45)",
                  color: "#7dd3fc",
                }}
              >
                All Daily Missions Claimed
              </span>
              <h2
                className="mt-1.5 text-lg font-black uppercase tracking-widest"
                style={{ fontFamily: "Cinzel, serif", color: "#7dd3fc" }}
              >
                🃏 Bonus Mystery Card
              </h2>
              <p className="mt-1 text-[11px] font-medium text-amber-100/70 leading-snug">
                {selected === null
                  ? "You unlocked one extra card today. Pick a card — the reward activates on reveal!"
                  : "Your bonus reward is active — use it before the timer runs out!"}
              </p>
            </div>

            <div className="relative flex items-center justify-center gap-3 mt-5">
              {layout.map((rwd, i) => (
                <MysteryCardFlip
                  key={i}
                  index={i}
                  reward={rwd}
                  selected={selected}
                  onPick={handlePick}
                  busy={busy}
                />
              ))}
            </div>

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
                      style={{ borderColor: `${meta.color}66`, background: `${meta.color}14` }}
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
                      style={{ borderColor: `${meta.color}66`, background: `${meta.color}14` }}
                    >
                      <p
                        className="text-xs font-black uppercase tracking-widest"
                        style={{ color: meta.color }}
                      >
                        +100 Chips & +100 Rank Points!
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-100/60">
                        Added to your 🏆RANK season score
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
                    onClick={onClose}
                    className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 hover:text-amber-200/80 transition"
                  >
                    PLAY LATER
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {selected === null && (
              <p className="relative mt-4 text-[10px] font-bold uppercase tracking-widest text-amber-200/40 text-center">
                Tap a card to reveal your bonus reward
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}