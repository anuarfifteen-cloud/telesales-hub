import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import { grossPayout, horseById } from "@/lib/horseRacing";
import RacerSprite from "./RacerSprite";

/**
 * The reminder that stands between opening the race and watching it: the bet the
 * player has riding on this race, then a 3-2-1 before the field is off.
 *
 * Shown only for the first watch of the day — a replay starts straight away.
 */
export default function PreRaceBetOverlay({ bet, horses, onStart }) {
  const [count, setCount] = useState(0);
  const horse = bet ? horseById(horses, bet.horse_id) : null;
  const payout = bet ? Number(bet.gross_payout) || grossPayout(bet.stake) : 0;

  useEffect(() => {
    if (!count) return undefined;
    const t = setTimeout(() => {
      if (count === 1) onStart();
      else setCount(count - 1);
    }, 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4 text-center"
      style={{ background: "rgba(4,26,19,0.92)", backdropFilter: "blur(3px)" }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">
        Before the off · your bet
      </p>

      {horse ? (
        <div className="w-full max-w-[16rem] rounded-2xl border border-amber-400/40 bg-emerald-950/70 px-3 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2.5">
            <span
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-amber-300/30"
              style={{ background: "linear-gradient(160deg,#eef7f1 0%,#dbeade 100%)" }}
            >
              <RacerSprite horseId={horse.id} size={44} frame={0} />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-black text-amber-50">
                <span style={{ color: horse.color }}>#{horse.number}</span> {horse.name}
              </p>
              <p className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-amber-200/75">
                <MiniChipIcon size={12} /> {bet.stake} chips staked
              </p>
            </div>
          </div>
          <p className="mt-2 rounded-lg bg-emerald-900/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
            1st pays {payout} chips
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-950/60 px-3 py-2.5 text-[11px] font-bold text-emerald-100/70">
          No bet placed for this race
        </p>
      )}

      {count > 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-4xl font-black leading-none text-amber-300 tabular-nums">{count}</span>
          <span className="text-[9px] font-black uppercase tracking-[0.24em] text-emerald-200/60">
            And they&apos;re off
          </span>
        </div>
      ) : (
        <button
          onClick={() => setCount(3)}
          className="flex w-full max-w-[16rem] items-center justify-center gap-1.5 rounded-full bg-amber-300 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-950 shadow-[0_3px_12px_rgba(212,175,55,0.45)] transition hover:brightness-105"
        >
          <Play className="h-3.5 w-3.5" /> Start race
        </button>
      )}
    </div>
  );
}