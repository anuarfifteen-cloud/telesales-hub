import PlayingCard from "../PlayingCard";
import { handValue } from "../blackjackDeck";

// The shared Dealer seat. Unlike the solo game the hole card is part of the
// table row, so each card decides for itself whether it is face up — the panel
// shows the visible total and "+ ?" while the hole card is still hidden.
export default function MpDealerPanel({ cards = [] }) {
  const visible = cards.filter((c) => c.faceUp !== false);
  const hiddenCount = cards.length - visible.length;
  const total = visible.length ? handValue(visible) : "—";

  return (
    <div
      className="rounded-2xl border border-white/15 p-3"
      style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/80">
          Dealer
        </span>
        <span className="text-sm font-black text-amber-300 tabular-nums">
          {hiddenCount > 0 ? `${total} + ?` : total}
        </span>
      </div>
      <div className="flex flex-wrap items-start" style={{ paddingRight: 16 }}>
        {cards.length === 0 && <span className="text-emerald-100/30 text-xs self-center">—</span>}
        {cards.map((c, i) => (
          <div key={i} style={{ marginRight: -16, position: "relative", zIndex: i + 1 }}>
            <PlayingCard card={c} small backOnly={c.faceUp === false} isNew zIndex={i + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}