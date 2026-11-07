import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlayingCard from "../PlayingCard";
import { handWinner, stakeLabel } from "@/lib/beatMyHand";
import ScoreboardRow from "./ScoreboardRow";

// One indexed hand pair at a time: creator's cards land first, then the
// challenger's, then the hand is called, then the table is swept for the next.
const CARD_MS = 300;
const PAIR_DONE_MS = 320;
const RESULT_HOLD_MS = 1500;
const SWEEP_MS = 620;

const TONES = {
  win: { text: "text-emerald-300", box: "border-emerald-400/40 bg-emerald-400/10" },
  lose: { text: "text-rose-300", box: "border-rose-400/40 bg-rose-400/10" },
  push: { text: "text-amber-300", box: "border-amber-400/40 bg-amber-400/10" },
};

const DOT = {
  creator: "bg-amber-400",
  opponent: "bg-sky-400",
  tie: "bg-white/30",
};

function SeatHand({ name, tag, cards, shown, score, won, decided }) {
  const complete = shown >= cards.length;
  return (
    <div
      className={`rounded-2xl border px-3 py-3 transition-colors ${
        decided && won
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-white/12 bg-white/[0.05]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="truncate text-[10px] font-black uppercase tracking-widest text-emerald-100/70">
            {name}
          </span>
          {tag && (
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100/35">
              {tag}
            </span>
          )}
        </span>
        <span className="text-lg font-black text-amber-300 tabular-nums leading-none">
          {complete ? score : "?"}
        </span>
      </div>
      <div className="flex min-h-[5.5rem] flex-wrap items-start gap-1.5">
        {cards.slice(0, shown).map((card, i) => (
          <PlayingCard key={`${name}-${i}`} card={card} isNew />
        ))}
        {shown === 0 && (
          <span className="self-center text-[10px] text-emerald-100/30">Dealing…</span>
        )}
      </div>
    </div>
  );
}

function ActionButton({ primary = false, className = "", children, ...props }) {
  if (primary) {
    return (
      <button
        {...props}
        className={`rounded-full py-2.5 text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-40 ${className}`}
        style={{ background: "#d4af37" }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      {...props}
      className={`rounded-full border border-white/20 bg-white/10 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-100 transition hover:bg-white/15 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function BestOfThreeShowdown({
  creatorName,
  creatorHands,
  opponentName,
  opponentHands,
  outcome,
  payout,
  wager,
  stakeType = "chips",
  viewerRole = "opponent",
  onClose,
  onPlayAgain,
  canPlayAgain = true,
  // Replaces the verdict block once the match is done — see ShowdownReveal.
  footer = null,
}) {
  const isCreator = viewerRole === "creator";
  const creatorList = Array.isArray(creatorHands) ? creatorHands : [];
  const opponentList = Array.isArray(opponentHands) ? opponentHands : [];
  const matchHands = Math.max(creatorList.length, opponentList.length, 1);
  const handAt = (list, i) => list[i] || { score: 0, cards: [] };

  // Each indexed pair is called on its own, then the totals decide the match.
  const results = Array.from({ length: matchHands }, (_, i) =>
    handWinner(handAt(creatorList, i).score, handAt(opponentList, i).score)
  );
  const creatorWins = results.filter((r) => r === "creator").length;
  const opponentWins = results.filter((r) => r === "opponent").length;

  const [hand, setHand] = useState(0);
  const [phase, setPhase] = useState("deal"); // deal | result | sweep | done
  const [shown, setShown] = useState(0);

  const creatorHand = handAt(creatorList, hand);
  const opponentHand = handAt(opponentList, hand);
  const creatorCards = Array.isArray(creatorHand.cards) ? creatorHand.cards : [];
  const opponentCards = Array.isArray(opponentHand.cards) ? opponentHand.cards : [];
  const pairTotal = creatorCards.length + opponentCards.length;
  const creatorShown = Math.min(shown, creatorCards.length);
  const opponentShown = Math.max(0, shown - creatorCards.length);

  // Reveal the pair card by card, creator first.
  useEffect(() => {
    if (phase !== "deal") return undefined;
    if (shown >= pairTotal) {
      const t = setTimeout(() => setPhase("result"), PAIR_DONE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), CARD_MS);
    return () => clearTimeout(t);
  }, [phase, shown, pairTotal]);

  // Hold the hand on screen so the call lands, then sweep it away.
  useEffect(() => {
    if (phase !== "result") return undefined;
    const t = setTimeout(() => setPhase("sweep"), RESULT_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "sweep") return undefined;
    const t = setTimeout(() => {
      if (hand + 1 < matchHands) {
        setHand((h) => h + 1);
        setShown(0);
        setPhase("deal");
      } else {
        setPhase("done");
      }
    }, SWEEP_MS);
    return () => clearTimeout(t);
  }, [phase, hand, matchHands]);

  const resolved = phase === "deal" ? hand : Math.min(hand + 1, matchHands);
  const liveCreatorWins = results.slice(0, resolved).filter((r) => r === "creator").length;
  const liveOpponentWins = results.slice(0, resolved).filter((r) => r === "opponent").length;
  const currentResult = results[hand];

  const stake = stakeLabel(Number(wager) || 0, stakeType);
  const pot = stakeLabel((Number(wager) || 0) * 2 || 0, stakeType);
  const myWins = isCreator ? creatorWins : opponentWins;
  const theirWins = isCreator ? opponentWins : creatorWins;

  let verdict;
  if (outcome === "push") {
    verdict = {
      label: "Push — match tied",
      tone: "push",
      line: `${creatorWins}–${opponentWins} on hands — your ${stake} comes back.`,
    };
  } else if (outcome === "house") {
    verdict = {
      label: "No winner",
      tone: "lose",
      line: "Neither hand stood for a win — the house keeps the pot.",
    };
  } else if ((outcome === "creator_win") === isCreator) {
    verdict = {
      label: "You win the match",
      tone: "win",
      line: `${myWins}–${theirWins} on hands — the ${pot} pot is yours.`,
    };
  } else {
    verdict = {
      label: "You lost the match",
      tone: "lose",
      line: `${theirWins}–${myWins} on hands — they take the ${pot} pot, you lose ${stake}.`,
    };
  }
  const tone = TONES[verdict.tone];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-center text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/70">
          Best of 3 showdown
        </p>
        <p className="text-center text-sm font-bold text-emerald-50">
          {stake} each · {pot} on the table
        </p>
      </div>

      {/* Scoreboard — hand wins only, updated the instant a hand is called. */}
      <div className="rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
          <span>Scoreboard</span>
          <span className="tabular-nums">
            Hand {Math.min(hand + 1, matchHands)} of {matchHands}
          </span>
        </div>
        <div className="mt-1.5">
          <ScoreboardRow
            creatorName={creatorName || "Poster"}
            opponentName={opponentName || "Challenger"}
            creatorWins={liveCreatorWins}
            opponentWins={liveOpponentWins}
          />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {results.map((result, i) => (
            <span
              key={i}
              className={`h-1.5 w-7 rounded-full ${
                i < resolved ? DOT[result] : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {phase !== "done" && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={hand}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100/45">
              Hand {hand + 1} of {matchHands}
            </p>

            <SeatHand
              name={creatorName || "Poster"}
              tag={isCreator ? "poster · you" : "poster"}
              cards={creatorCards}
              shown={creatorShown}
              score={Number(creatorHand.score) || 0}
              won={currentResult === "creator"}
              decided={phase !== "deal"}
            />
            <SeatHand
              name={opponentName || "Challenger"}
              tag={isCreator ? "challenger" : "challenger · you"}
              cards={opponentCards}
              shown={opponentShown}
              score={Number(opponentHand.score) || 0}
              won={currentResult === "opponent"}
              decided={phase !== "deal"}
            />

            {phase !== "deal" && (
              <p
                className={`text-center text-[11px] font-black uppercase tracking-widest ${
                  currentResult === "tie" ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {currentResult === "tie"
                  ? `Hand ${hand + 1} tied — no hand point`
                  : `${
                      currentResult === "creator"
                        ? creatorName || "Poster"
                        : opponentName || "Challenger"
                    } takes hand ${hand + 1}`}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {phase === "done" && footer}

      {phase === "done" && !footer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`rounded-xl border px-3 py-3 text-center ${tone.box}`}
        >
          <p className={`text-sm font-black uppercase tracking-widest ${tone.text}`}>
            {verdict.label}
          </p>
          <p className="mt-1 text-[11px] text-emerald-100/70">{verdict.line}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
            <span className="tabular-nums text-emerald-100/60">
              {creatorWins}–{opponentWins} on hands
            </span>
            <span className="text-emerald-100/30">·</span>
            <span
              className={`tabular-nums ${payout > 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
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
                  Play Again · Best of 3
                </ActionButton>
              )}
              <ActionButton onClick={onClose} className="flex-1">
                Back to the board
              </ActionButton>
            </div>
          </div>

          {!canPlayAgain && (
            <p className="mt-2 text-[10px] text-rose-300/80">
              Not enough {stakeType === "diamond" ? "Diamonds" : "chips"} to replay this wager.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}