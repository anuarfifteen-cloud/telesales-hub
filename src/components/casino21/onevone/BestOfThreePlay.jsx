import { useEffect, useRef, useState } from "react";
import LocalHand from "./LocalHand";
import { MATCH_HANDS } from "@/lib/beatMyHand";

// How long the finished hand stays on screen before the next one is dealt.
const NEXT_HAND_DELAY_MS = 1300;

// Three local hands, played one after another. Each hand gets its own fresh
// deck, its own turn clock and its own Hit/Stand, and the whole set is handed
// back only once the third hand is finished.
export default function BestOfThreePlay({ onMatchDone, timeLimit = null, disabled = false }) {
  const [hands, setHands] = useState([]);
  const [handIndex, setHandIndex] = useState(0);
  const [handKey, setHandKey] = useState(0);
  const [between, setBetween] = useState(false);

  const handsRef = useRef([]);
  const doneRef = useRef(false);
  const timerRef = useRef(null);
  const onMatchDoneRef = useRef(onMatchDone);
  onMatchDoneRef.current = onMatchDone;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleHandDone = (score, cards) => {
    if (doneRef.current) return;
    const next = [
      ...handsRef.current,
      { score: Number(score) || 0, cards: Array.isArray(cards) ? cards : [] },
    ];
    handsRef.current = next;
    setHands(next);

    if (next.length < MATCH_HANDS) {
      setBetween(true);
      timerRef.current = setTimeout(() => {
        setHandIndex((i) => i + 1);
        setHandKey((k) => k + 1);
        setBetween(false);
      }, NEXT_HAND_DELAY_MS);
      return;
    }

    doneRef.current = true;
    onMatchDoneRef.current?.(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
          Best of 3
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/50 tabular-nums">
          Hand {Math.min(handIndex + 1, MATCH_HANDS)} of {MATCH_HANDS}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: MATCH_HANDS }).map((_, i) => {
          const played = hands[i];
          return (
            <div
              key={i}
              className={`rounded-lg border px-2 py-1.5 text-center ${
                played
                  ? "border-amber-400/30 bg-amber-400/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">
                Hand {i + 1}
              </p>
              <p className="text-sm font-black text-amber-200 tabular-nums leading-tight">
                {played ? played.score : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {between ? (
        <p className="py-6 text-center text-[11px] font-black uppercase tracking-widest text-amber-200 animate-pulse">
          Hand {hands.length} locked · dealing hand {hands.length + 1}…
        </p>
      ) : (
        <LocalHand
          key={handKey}
          timeLimit={timeLimit}
          disabled={disabled}
          onHandDone={handleHandDone}
        />
      )}
    </div>
  );
}