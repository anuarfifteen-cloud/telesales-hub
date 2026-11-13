import { RotateCcw } from "lucide-react";
import { ordinal, raceResults } from "@/lib/derbyFinish";
import { pointsForPlace } from "@/lib/derbySeason";
import { rewardForPlace } from "@/lib/horseRacing";
import RacerSprite from "./RacerSprite";

const PLACE_BADGE = [
  "bg-amber-300 text-amber-950",
  "bg-slate-200 text-slate-700",
  "bg-orange-300 text-orange-950",
];

/**
 * The official result, laid over the finished track: every runner from 1st to
 * 6th with its time to the hundredth, the player's own bet summary, and the
 * replay control. Points and chips come from the same config the season uses.
 */
export default function RaceResultsOverlay({ horses, winnerId, bet, onReplay }) {
  const rows = raceResults(horses, winnerId);
  const mine = bet ? rows.find((row) => row.id === bet.horse_id) || null : null;
  const place = mine?.place || 0;
  const points = place ? pointsForPlace(place) : 0;
  const chips = place ? rewardForPlace(place, bet.stake) : 0;
  const placed = place > 0 && place <= 3;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col gap-1.5 px-2.5 py-2"
      style={{ background: "rgba(4,26,19,0.9)", backdropFilter: "blur(3px)" }}
    >
      <div className="flex shrink-0 items-baseline justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">Official result</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-200/60">Finish time</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto">
        {rows.map((row) => {
          const isMine = Boolean(bet) && row.id === bet.horse_id;
          return (
            <div
              key={row.id}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-[3px]"
              style={{
                background: isMine
                  ? "rgba(252,211,77,0.18)"
                  : row.place === 1
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(255,255,255,0.05)",
                boxShadow: isMine
                  ? "inset 0 0 0 1px rgba(252,211,77,0.8)"
                  : row.place === 1
                    ? "inset 0 0 0 1px rgba(252,211,77,0.45)"
                    : "none",
              }}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                  PLACE_BADGE[row.place - 1] || "bg-white/10 text-emerald-100"
                }`}
              >
                {row.place}
              </span>
              <span className="relative h-6 w-6 shrink-0">
                <RacerSprite horseId={row.id} size={24} frame={0} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-emerald-50">
                <span style={{ color: row.color }}>{row.number}</span> {row.name}
              </span>
              {isMine && (
                <span className="shrink-0 rounded-full bg-amber-300 px-1.5 py-[1px] text-[7px] font-black uppercase tracking-wider text-emerald-950">
                  Your bet
                </span>
              )}
              <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-amber-200">
                {row.time}
              </span>
            </div>
          );
        })}
      </div>

      {mine && (
        <div
          className="shrink-0 rounded-xl px-2 py-1.5"
          style={{
            background: "linear-gradient(135deg,rgba(246,196,69,0.24) 0%,rgba(246,196,69,0.06) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(252,211,77,0.55)",
          }}
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">Your bet result</p>
            <p className="text-[10px] font-black tabular-nums text-amber-200">+{points} pts</p>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="relative h-5 w-5 shrink-0">
              <RacerSprite horseId={mine.id} size={20} frame={0} />
            </span>
            <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-emerald-50">
              <span style={{ color: mine.color }}>#{mine.number}</span> {mine.name}
            </p>
            <p className="shrink-0 text-[10px] font-black text-amber-100">Finished {ordinal(place)}</p>
          </div>
          <p
            className={`mt-0.5 text-[11px] font-black ${
              placed ? "text-amber-300" : "text-emerald-200/60"
            }`}
          >
            {placed
              ? `+${chips} chips ${place === 1 ? "won" : "refunded"}!`
              : "Did not place in Top 3 • 0 chips"}
          </p>
        </div>
      )}

      <button
        onClick={onReplay}
        className="mt-0.5 flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-300 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-950 shadow-[0_3px_12px_rgba(212,175,55,0.45)] transition hover:brightness-105"
      >
        <RotateCcw className="h-3 w-3" /> Replay race
      </button>
    </div>
  );
}