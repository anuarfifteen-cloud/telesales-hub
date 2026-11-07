import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import OpenBetsBoard from "./OpenBetsBoard";
import { stakeLabel } from "@/lib/beatMyHand";

const COUNTDOWN_FROM = 3;

const TONES = {
  win: { text: "text-emerald-300", box: "border-emerald-400/40 bg-emerald-400/10" },
  lose: { text: "text-rose-300", box: "border-rose-400/40 bg-rose-400/10" },
  draw: { text: "text-amber-300", box: "border-amber-400/40 bg-amber-400/10" },
};

// The challenger's own verdict, read from their seat only, followed by the live
// open board in exactly the same spot — no page change, the showdown stays up.
export default function ChallengerResultSwap({
  outcome,
  wager,
  stakeType = "chips",
  payout = 0,
  challenges,
  loading,
  onAccept,
  busy,
  user,
}) {
  const [seconds, setSeconds] = useState(COUNTDOWN_FROM);
  const [showBoard, setShowBoard] = useState(false);

  useEffect(() => {
    if (showBoard) return undefined;
    if (seconds <= 0) {
      setShowBoard(true);
      return undefined;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, showBoard]);

  if (showBoard) {
    return (
      <OpenBetsBoard
        challenges={challenges}
        loading={loading}
        onAccept={onAccept}
        busy={busy}
        user={user}
        emptyText="No open bets right now — check back in a moment."
      />
    );
  }

  const stake = Number(wager) || 0;
  const winnings = Number(payout) || 0;

  const result =
    outcome === "opponent_win"
      ? {
          label: "You win",
          tone: "win",
          detail: `+${stakeLabel(winnings, stakeType)}`,
          detailTone: "text-emerald-300",
        }
      : outcome === "push"
        ? {
            label: "Draw",
            tone: "draw",
            detail: `Stake refunded (${stakeLabel(winnings || stake, stakeType)})`,
            detailTone: "text-emerald-100/70",
          }
        : {
            label: "You lose",
            tone: "lose",
            detail: `−${stakeLabel(stake, stakeType)}`,
            detailTone: "text-rose-300",
          };
  const tone = TONES[result.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl border px-3 py-4 text-center ${tone.box}`}
    >
      <p className={`text-base font-black uppercase tracking-[0.2em] ${tone.text}`}>
        {result.label}
      </p>
      <p className={`mt-1 text-sm font-black tabular-nums ${result.detailTone}`}>
        {result.detail}
      </p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100/50 tabular-nums">
        Loading board in {seconds}...
      </p>
    </motion.div>
  );
}