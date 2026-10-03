import { AnimatePresence } from "framer-motion";
import PlayingCard from "./PlayingCard";

// Split an array into rows of `size` for wrapped fanning.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Glassmorphism seat panel. `revealHole` hides the dealer's cards until the
// reveal; `tag` renders a small badge (e.g. "AI"); `compact` shrinks the panel
// for the dealer/AI seats so three fit on the mobile felt.
export default function HandPanel({ title, value, cards, revealHole = true, tag, compact = false, hidden = false }) {
  const isHidden = hidden || (title === "DEALER" && !revealHole);
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
          {isHidden ? "?" : value !== undefined && value !== null ? value : "—"}
        </span>
      </div>
      {cards.length === 0 ? (
        <div className={`flex items-center ${compact ? "min-h-[4rem]" : "min-h-[5.5rem]"}`}>
          <span className="text-emerald-100/30 text-xs">—</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <AnimatePresence>
            {chunk(cards, 4).map((row, ri) => (
              <div key={ri} className="flex items-start -space-x-6">
                {row.map((c, i) => {
                  const idx = ri * 4 + i;
                  return (
                    <PlayingCard
                      key={isHidden ? `${title}-${idx}-back` : `${title}-${idx}-${c.rank}${c.suit}`}
                      card={c}
                      delay={idx * 0.15}
                      isNew
                      small={compact}
                      backOnly={isHidden}
                      faceDown={false}
                      zIndex={idx + 1}
                    />
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}