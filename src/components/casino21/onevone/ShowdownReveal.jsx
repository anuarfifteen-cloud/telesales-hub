import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PlayingCard from "../PlayingCard";
import { stakeLabel } from "@/lib/beatMyHand";

const CARD_MS = 340;
const VERDICT_DELAY_MS = 500;

const TONES = {
  win: { text: "text-emerald-300", box: "border-emerald-400/40 bg-emerald-400/10" },
  lose: { text: "text-rose-300", box: "border-rose-400/40 bg-rose-400/10" },
  push: { text: "text-amber-300", box: "border-amber-400/40 bg-amber-400/10" },
};

// Worded from the viewer's seat — the poster and the challenger read the same
// hand in opposite directions.
function verdictFor(outcome, wager, stakeType, isCreator) {
  const stake = stakeLabel(wager, stakeType);
  const pot = stakeLabel(wager * 2, stakeType);
  if (outcome === "push") {
    return { label: "Push", tone: "push", line: `Both hands tied — your ${stake} comes back.` };
  }
  if (outcome === "house") {
    return { label: "Both busted", tone: "lose", line: `Neither hand stood — the house keeps the ${pot} pot.` };
  }
  const iWon = isCreator ? outcome === "creator_win" : outcome === "opponent_win";
  if (iWon) {
    return { label: "You win the pot", tone: "win", line: `Your hand takes the ${pot} pot.` };
  }
  return {
    label: isCreator ? "The challenger's hand wins" : "The poster's hand wins",
    tone: "lose",
    line: `Their hand beat yours — you lose ${stake}.`,
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

// One full-width seat. Stacked vertically so the cards keep their full size
// instead of being squeezed into half a screen. Cards arrive one at a time and
// the total only shows once that seat's hand is fully dealt.
function SeatHand({ name, label, cards, shown, score, winner }) {
  const complete = shown >= cards.length;
  return (
    <div
      className={`rounded-2xl border px-3 py-3 transition-colors ${
        complete && winner
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-white/12 bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/70 truncate">
            {name}
          </span>
          {label && (
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100/35">
              {label}
            </span>
          )}
        </span>
        <span className="text-lg font-black text-amber-300 tabular-nums leading-none">
          {complete ? score : "?"}
        </span>
      </div>
      <div className="flex flex-wrap items-start gap-1.5 min-h-[5.5rem]">
        {cards.slice(0, shown).map((card, i) => (
          <PlayingCard key={`${name}-${i}`} card={card} isNew />
        ))}
        {shown === 0 && (
          <span className="text-[10px] text-emerald-100/30 self-center">Dealing…</span>
        )}
      </div>
    </div>
  );
}

// `viewerRole` decides which stacked hand is labelled "You" — the viewer always
// reads their own hand on top and the opponent's underneath.
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
  stakeType = "chips",
  onClose,
  onPlayAgain,
  canPlayAgain = true,
  viewerRole = "opponent",
  // When given, it replaces the verdict block under the cards — the challenger
  // shows their own result there and then the live board in its place.
  footer = null,
}) {
  const isCreator = viewerRole === "creator";
  const creatorHand = Array.isArray(creatorCards) ? creatorCards : [];
  const opponentHand = Array.isArray(opponentCards) ? opponentCards : [];
  const myCards = isCreator ? creatorHand : opponentHand;
  const theirCards = isCreator ? opponentHand : creatorHand;
  const total = myCards.length + theirCards.length;

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

  // Alternate one card per hand so both build together, then let the longer
  // hand finish alone — each seat's total appears on its own last card.
  const order = [];
  for (let i = 0; i < Math.max(myCards.length, theirCards.length); i += 1) {
    if (i < myCards.length) order.push("mine");
    if (i < theirCards.length) order.push("theirs");
  }
  const dealt = order.slice(0, revealed);
  const myShown = dealt.filter((side) => side === "mine").length;
  const theirShown = dealt.filter((side) => side === "theirs").length;

  const verdict = verdictFor(outcome, Number(wager) || 0, stakeType, isCreator);
  const tone = TONES[verdict.tone];
  const myScore = isCreator ? creatorScore : opponentScore;
  const theirScore = isCreator ? opponentScore : creatorScore;
  const iWon = isCreator ? outcome === "creator_win" : outcome === "opponent_win";
  const theyWon = isCreator ? outcome === "opponent_win" : outcome === "creator_win";
  const opponentLabel = isCreator ? opponentName || "Challenger" : creatorName || "Poster";

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/70">
          Showdown
        </p>
        <p className="text-sm font-bold text-emerald-50">
          {stakeLabel(Number(wager) || 0, stakeType)} each ·{" "}
          {stakeLabel(Number(wager) * 2 || 0, stakeType)} on the table
        </p>
      </div>

      {/* Stacked, full-width hands — large cards, read top to bottom. */}
      <div className="flex flex-col gap-2">
        <SeatHand
          name="You"
          label={isCreator ? "poster" : "challenger"}
          cards={myCards}
          shown={myShown}
          score={myScore}
          winner={iWon}
        />
        <SeatHand
          name={opponentLabel}
          label={isCreator ? "challenger" : "poster"}
          cards={theirCards}
          shown={theirShown}
          score={theirScore}
          winner={theyWon}
        />
      </div>

      {verdictVisible && footer}

      {verdictVisible && !footer && (
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

          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold flex-wrap">
            <span className="text-emerald-100/60 tabular-nums">
              {myScore} vs {theirScore}
            </span>
            <span className="text-emerald-100/30">·</span>
            <span className={`tabular-nums ${payout > 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {payout > 0
                ? `+${stakeLabel(payout, stakeType)} to you`
                : `−${stakeLabel(Number(wager) || 0, stakeType)}`}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {payout > 0 && (
              <div className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                ✓ Winnings automatically credited to your balance
              </div>
            )}
            <div className="flex gap-2">
              {onPlayAgain && (
                <ActionButton
                  primary
                  onClick={onPlayAgain}
                  disabled={!canPlayAgain}
                  className="flex-1"
                >
                  Play Again · {stakeLabel(Number(wager) || 0, stakeType)}
                </ActionButton>
              )}
              <ActionButton onClick={onClose} className="flex-1">
                Back to the board
              </ActionButton>
            </div>
          </div>
          {!canPlayAgain && (
            <p className="text-[10px] text-rose-300/80 mt-2">
              Not enough {stakeType === "diamond" ? "Diamonds" : "chips"} to replay this wager.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}