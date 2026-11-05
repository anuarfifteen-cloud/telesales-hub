import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Shield, Timer } from "lucide-react";
import HandPanel from "../HandPanel";
import { createDeck, shuffle, handValue, isBust, isBlackjack } from "../blackjackDeck";

// A single local hand against no dealer — Beat My Hand is player vs player, so
// the only thing that matters is the total you finish on. Remount with a new
// `key` to deal a fresh hand, and mount it only after the wager is locked.
//
// `timeLimit` (seconds) starts a visible turn clock; when it reaches zero the
// hand is stood as-is. A bust stands and submits immediately either way.
export default function LocalHand({ onHandDone, disabled = false, timeLimit = null }) {
  const [state, setState] = useState(() => {
    const deck = shuffle(createDeck());
    return { deck, cards: [deck.pop(), deck.pop()] };
  });
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(timeLimit ?? 0);

  const finishedRef = useRef(false);
  const cardsRef = useRef(state.cards);
  cardsRef.current = state.cards;
  const onDoneRef = useRef(onHandDone);
  onDoneRef.current = onHandDone;

  // Submits exactly once, whatever path got here (stand, bust or timeout).
  const finish = useCallback((cards, reason) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    if (reason) setNote(reason);
    onDoneRef.current?.(handValue(cards), cards);
  }, []);

  // Turn clock.
  useEffect(() => {
    if (!timeLimit) return undefined;
    const deadline = Date.now() + timeLimit * 1000;
    setSeconds(timeLimit);
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (left <= 0) {
        clearInterval(id);
        finish(cardsRef.current, "Time up — auto-stood");
      }
    }, 250);
    return () => clearInterval(id);
  }, [timeLimit, finish]);

  const total = handValue(state.cards);
  const bust = isBust(state.cards);
  const natural = isBlackjack(state.cards);
  const locked = done || disabled;

  const hit = () => {
    if (locked) return;
    const deck = [...state.deck];
    const cards = [...state.cards, deck.pop()];
    setState({ deck, cards });
    // Bust → stand and submit straight away, no manual click.
    if (isBust(cards)) finish(cards, "Bust — auto-stood");
  };

  const stand = () => {
    if (locked) return;
    finish(state.cards, "Stood");
  };

  return (
    <div className="flex flex-col gap-3">
      {timeLimit != null && !done && (
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-amber-300" />
          <span
            className={`text-[11px] font-black tabular-nums ${
              seconds <= 5 ? "text-rose-300" : "text-amber-200"
            }`}
          >
            {seconds}s
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                seconds <= 5 ? "bg-rose-400" : "bg-amber-400"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (seconds / timeLimit) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <HandPanel
        title="YOUR HAND"
        tag={natural ? "21" : undefined}
        value={total}
        cards={state.cards}
      />

      {done ? (
        <p
          className={`text-center text-xs font-black uppercase tracking-widest ${
            bust ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {note || (bust ? `Bust at ${total}` : `Final hand: ${total}`)}
          {bust ? ` · ${total}` : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={hit}
            disabled={locked}
            className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
            style={{ background: "#d4af37" }}
          >
            <Plus className="inline mr-1 w-4 h-4" /> Hit
          </button>
          <button
            onClick={stand}
            disabled={locked}
            className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-100 bg-emerald-700/60 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
          >
            <Shield className="inline mr-1 w-4 h-4" /> Stand
          </button>
        </div>
      )}
    </div>
  );
}