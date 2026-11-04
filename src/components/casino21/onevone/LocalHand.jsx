import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import HandPanel from "../HandPanel";
import { createDeck, shuffle, handValue, isBust, isBlackjack } from "../blackjackDeck";

// A single local hand against no dealer — Beat My Hand is player vs player, so
// the only thing that matters is the total you finish on. Remount with a new
// `key` to deal a fresh hand.
export default function LocalHand({ onHandDone, disabled = false }) {
  const [state, setState] = useState(() => {
    const deck = shuffle(createDeck());
    return { deck, cards: [deck.pop(), deck.pop()] };
  });
  const [done, setDone] = useState(false);

  const total = handValue(state.cards);
  const bust = isBust(state.cards);
  const natural = isBlackjack(state.cards);

  const finish = (cards) => {
    setDone(true);
    onHandDone?.(handValue(cards));
  };

  const hit = () => {
    if (done || disabled) return;
    const deck = [...state.deck];
    const cards = [...state.cards, deck.pop()];
    setState({ deck, cards });
    if (isBust(cards)) finish(cards);
  };

  const stand = () => {
    if (done || disabled) return;
    finish(state.cards);
  };

  return (
    <div className="flex flex-col gap-3">
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
          {bust ? `Bust at ${total} — still postable` : `Final hand: ${total}`}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={hit}
            disabled={disabled}
            className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
            style={{ background: "#d4af37" }}
          >
            <Plus className="inline mr-1 w-4 h-4" /> Hit
          </button>
          <button
            onClick={stand}
            disabled={disabled}
            className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-100 bg-emerald-700/60 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
          >
            <Shield className="inline mr-1 w-4 h-4" /> Stand
          </button>
        </div>
      )}
    </div>
  );
}