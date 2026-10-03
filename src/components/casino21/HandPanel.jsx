import { AnimatePresence } from "framer-motion";
import PlayingCard from "./PlayingCard";

// Glassmorphism seat panel. `revealHole` hides the dealer's cards until the
// reveal; `tag` renders a small badge (e.g. "AI"); `compact` shrinks the panel
// for the dealer/AI seats so three fit on the mobile felt.
export default function HandPanel({ title, value, cards, revealHole = true, tag, compact = false }) {
  return (
    <div
      className={`rounded-2xl border border-white/15 ${compact ? "p-2" : "p-3"}`}
      style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/80">
            {title}
          </span>
          {tag && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[8px] font-black uppercase tracking-widest text-amber-300">
              {tag}
            </span>
          )}
        </span>
        <span className="text-sm font-black text-amber-300 tabular-nums">
          {value !== undefined && value !== null ? value : "—"}
        </span>
      </div>
      <div className={`flex items-start ${compact ? "min-h-[4rem] -space-x-4 sm:-space-x-5" : "min-h-[5.5rem] gap-2"}`}>
        <AnimatePresence>
          {cards.map((c, i) => {
            const isDealerHidden = title === "DEALER" && !revealHole;
            return (
              <PlayingCard
                key={isDealerHidden ? `${title}-${i}-back` : `${title}-${i}-${c.rank}${c.suit}`}
                card={c}
                delay={i * 0.15}
                isNew
                backOnly={isDealerHidden}
                faceDown={false}
              />
            );
          })}
        </AnimatePresence>
        {cards.length === 0 && <span className="text-emerald-100/30 text-xs self-center">—</span>}
      </div>
    </div>
  );
}