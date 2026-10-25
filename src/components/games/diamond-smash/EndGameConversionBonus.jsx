import { useEffect, useRef, useState } from "react";

const TICK_MS = 240;
const HOLD_MS = 1200;

// Staged End-Game Conversion payout: one +100 tick per leftover move, then the
// total bonus, then it hands back to the final-score block. The total is never
// recalculated here — it always mirrors the amount already credited to the score.
export default function EndGameConversionBonus({ moves, perMove, total, onDone }) {
  const [applied, setApplied] = useState(0);
  const [phase, setPhase] = useState("moves"); // moves → total
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (moves <= 0) {
      setPhase("total");
      return;
    }
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      setApplied(count);
      if (count >= moves) {
        clearInterval(id);
        setPhase("total");
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [moves]);

  useEffect(() => {
    if (phase !== "total") return;
    const id = setTimeout(() => doneRef.current?.(), HOLD_MS);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        💰 End-Game Conversion
      </p>
      <p
        key={applied}
        className="font-black text-2xl tabular-nums text-emerald-500 dark:text-emerald-300"
        style={{ animation: "dsBonusTick 240ms ease-out" }}
      >
        +{applied * perMove}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 tabular-nums">
        {applied} / {moves} moves × {perMove}
      </p>
      {phase === "total" && (
        <p
          className="mt-0.5 font-black text-base text-amber-500 dark:text-amber-300 tabular-nums"
          style={{ animation: "dsBonusTotal 320ms ease-out" }}
        >
          Total bonus +{total}
        </p>
      )}
    </div>
  );
}