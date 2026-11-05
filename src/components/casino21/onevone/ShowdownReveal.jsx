import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PlayingCard from "../PlayingCard";
import MiniChipIcon from "../MiniChipIcon";

const CARD_MS = 340;
const VERDICT_DELAY_MS = 500;

const TONES = {
  win: { text: "text-emerald-300", box: "border-emerald-400/40 bg-emerald-400/10" },
  lose: { text: "text-rose-300", box: "border-rose-400/40 bg-rose-400/10" },
  push: { text: "text-amber-300", box: "border-amber-400/40 bg-amber-400/10" },
};

// Worded from the viewer's seat — the poster and the challenger read the same
// hand in opposite directions.
function verdictFor(outcome, wager, isCreator) {
  if (outcome === "push") {
    return { label: "Push", tone: "push", line: `Both hands tied — your ${wager} chips come back.` };
  }
  if (outcome === "house") {
    return { label: "Both busted", tone: "lose", line: `Neither hand stood — the house keeps the ${wager * 2}-chip pot.` };
  }
  const iWon = isCreator ? outcome === "creator_win" : outcome === "opponent_win";
  if (iWon) {
    return { label: "You win the pot", tone: "win", line: `Your hand takes the ${wager * 2}-chip pot.` };
  }
  return {
    label: isCreator ? "The challenger's hand wins" : "The poster's hand wins",
    tone: "lose",
    line: `Their hand beat yours — you lose ${wager} chips.`,
  };
}

function ActionButton({ primary = false, className = "", children, ...props }) {
  if (primary) {
    return (
      <button
        {...props}
        className={`py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-emerald-950 disabled:opacity-40 ${className}`}
        style={{ background: "#d4af37" }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      {...props}
      className={`py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-emerald-100 bg-white/10 border border-white/20 hover:bg-white/15 transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

// One side of the showdown. Cards arrive one at a time; the total only shows
// once that seat's hand is fully dealt.
function SeatHand({ name, cards, shown, score, winner }) {
  const complete = shown >= cards.length;
  return (
    <div
      className={`flex-1 min-w-0 rounded-xl border px-2 py-2 transition-colors ${
        complete && winner
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-white/12 bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70 truncate">
          {name}
        </span>
        <span className="text-sm font-black text-amber-300 tabular-nums">
          {complete ? score : "?"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 min-h-[4rem]">
        {cards.slice(0, shown).map((card, i) => (
          <PlayingCard key={`${name}-${i}`} card={card} isNew small />
        ))}
        {shown === 0 && (
          <span className="text-[10px] text-emerald-100/30 self-center">Dealing…</span>
        )}
      </div>
    </div>
  );
}

// `viewerRole` decides which seat is labelled "You", so the poster replaying a
// settled challenge sees their own hand on the left.
export default function ShowdownReveal({
  creatorName,
  creatorCards,
  creatorScore,
  opponentName,
  opponentCards,
  opponentScore,
  outcome,
  payout,
  wager,
  onClose,
  onPlayAgain,
  canPlayAgain = true,
  viewerRole = "opponent",
  onCollect,
  collectLabel,
  collecting = false,
}) {
  const theirs = Array.isArray(creatorCards) ? creatorCards : [];
  const mine = Array.isArray(opponentCards) ? opponentCards : [];
  const total = theirs.length + mine.length;

  const [revealed, setRevealed] = useState(0);
  const [verdictVisible, setVerdictVisible] = useState(false);

  useEffect(() => {
    if (total === 0) {
      setVerdictVisible(true);
      return undefined;
    }
    if (revealed >= total) {
      const t = setTimeout(() => setVerdictVisible(true), VERDICT_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), CARD_MS);
    return () => clearTimeout(t);
  }, [revealed, total]);

  // Alternate one card per side so both hands build up together.
  const theirShown = Math.min(theirs.length, Math.ceil(revealed / 2));
  const myShown = Math.min(mine.length, Math.floor(revealed / 2));

  const isCreator = viewerRole === "creator";
  const verdict = verdictFor(outcome, Number(wager) || 0, isCreator);
  const tone = TONES[verdict.tone];
  const leftName = isCreator ? "You" : creatorName || "Poster";
  const rightName = isCreator ? opponentName || "Challenger" : "You";

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/70">
          Showdown
        </p>
        <p className="text-sm font-bold text-emerald-50">
          {Number(wager) || 0}-chip pot · {wager * 2} chips on the table
        </p>
      </div>

      <div className="flex gap-2">
        <SeatHand
          name={leftName}
          cards={theirs}
          shown={theirShown}
          score={creatorScore}
          winner={outcome === "creator_win"}
        />
        <SeatHand
          name={rightName}
          cards={mine}
          shown={myShown}
          score={opponentScore}
          winner={outcome === "opponent_win"}
        />
      </div>

      {verdictVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`rounded-xl border px-3 py-3 text-center ${tone.box}`}
        >
          <p className={`text-sm font-black uppercase tracking-widest ${tone.text}`}>
            {verdict.label}
          </p>
          <p className="text-[11px] text-emerald-100/70 mt-1">{verdict.line}</p>

          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold">
            <MiniChipIcon size={12} />
            <span className="text-emerald-100/60 tabular-nums">
              {creatorScore} vs {opponentScore}
            </span>
            <span className="text-emerald-100/30">·</span>
            <span className={`tabular-nums ${payout > 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {payout > 0 ? `+${payout} chips to you` : `−${wager} chips`}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {onCollect && (
              <ActionButton primary onClick={onCollect} disabled={collecting}>
                {collecting ? "Collecting…" : collectLabel || "Collect chips"}
              </ActionButton>
            )}
            <div className="flex gap-2">
              {onPlayAgain && (
                <ActionButton
                  primary={!onCollect}
                  onClick={onPlayAgain}
                  disabled={!canPlayAgain}
                  className="flex-1"
                >
                  Play Again · {wager}
                </ActionButton>
              )}
              <ActionButton onClick={onClose} className="flex-1">
                Back to the board
              </ActionButton>
            </div>
          </div>
          {!canPlayAgain && (
            <p className="text-[10px] text-rose-300/80 mt-2">
              Not enough chips to replay this wager.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}