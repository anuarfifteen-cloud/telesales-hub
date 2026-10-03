import { AnimatePresence } from "framer-motion";
import PlayingCard from "./PlayingCard";

// Light fanned overlap (px) shared by You / Player 2 so all corner values stay
// readable. Cards wrap to rows of up to 3 — the panel grows downward to fit.
const OVERLAP = 8;
// Dealer seat uses a much tighter pack so a 6+ card hand stays safely inside the
// panel (cards show mostly just the left edge).
const DEALER_OVERLAP = 40;

// Glassmorphism seat panel. `revealHole` hides the dealer's cards until the
// reveal; `tag` renders a small badge (e.g. "AI"); `compact` shrinks the panel
// for the player/AI seats so two fit side-by-side on the mobile felt. `overlap`
// overrides the negative horizontal card spacing (Dealer uses the tight value).
export default function HandPanel({ title, value, cards, revealHole = true, tag, compact = false, hidden = false, overlap }) {
  const isHidden = hidden || (title === "DEALER" && !revealHole);
  const gap = overlap !== undefined && overlap !== null ? overlap : OVERLAP;
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
      <div
        className="flex flex-wrap items-start"
        style={{ minHeight: compact ? "4rem" : "5.5rem", paddingRight: gap }}
      >
        <AnimatePresence>
          {cards.map((c, i) => (
            <div
              key={isHidden ? `${title}-${i}-back` : `${title}-${i}-${c.rank}${c.suit}`}
              style={{ marginRight: -gap, position: "relative", zIndex: i + 1 }}
            >
              <PlayingCard
                card={c}
                delay={i * 0.15}
                isNew
                small={compact}
                backOnly={isHidden}
                faceDown={false}
                zIndex={i + 1}
              />
            </div>
          ))}
        </AnimatePresence>
        {cards.length === 0 && <span className="text-emerald-100/30 text-xs self-center">—</span>}
      </div>
    </div>
  );
}