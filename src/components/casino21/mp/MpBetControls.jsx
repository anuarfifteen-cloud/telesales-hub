import MiniChipIcon from "../MiniChipIcon";
import { MIN_BET, MAX_BET } from "./mpEngine";

// Wager picker for the PvP betting phase. All wagers in a round must match, so
// once the first bet sets the common wager every other bettor is locked to it
// (a single "Match" button). Before any wager lands the slider is free.
export default function MpBetControls({ bet, setBet, chips, busy, commonWager, onPlace, onOpenCashier }) {
  const balance = Number(chips) || 0;
  const locked = Number(commonWager) > 0;
  const wager = locked ? Number(commonWager) : Math.min(Math.max(Number(bet) || MIN_BET, MIN_BET), Math.max(MIN_BET, Math.min(MAX_BET, balance)));
  const tooPoor = balance < MIN_BET;
  const cantMatch = locked && balance < wager;

  return (
    <div className="flex flex-col gap-2">
      {locked ? (
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
            Buy-in set
          </span>
          <span className="flex items-center gap-1.5 text-amber-200 font-black text-sm tabular-nums">
            <MiniChipIcon size={14} /> {wager} chips
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBet(Math.max(MIN_BET, wager - 1))}
              disabled={tooPoor || wager <= MIN_BET}
              className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
            >
              ‹
            </button>
            <input
              type="range"
              min={MIN_BET}
              max={Math.max(MIN_BET, Math.min(MAX_BET, balance))}
              step={1}
              value={wager}
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={tooPoor}
              className="flex-1 accent-amber-400"
            />
            <button
              onClick={() => setBet(Math.min(MAX_BET, Math.min(balance, wager + 1)))}
              disabled={tooPoor || wager >= Math.min(MAX_BET, balance)}
              className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
            >
              ›
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
              <MiniChipIcon size={14} /> {wager} CHIPS
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200/60">
              sets the buy-in
            </span>
          </div>
        </>
      )}

      <button
        onClick={() => onPlace(wager)}
        disabled={tooPoor || cantMatch || busy}
        className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
        style={{ background: "#d4af37" }}
      >
        {locked ? `Match ${wager} Chips` : `Place ${wager} Chip Bet`}
      </button>

      {tooPoor && (
        <button
          onClick={onOpenCashier}
          className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
        >
          You need {MIN_BET} chip to play — buy chips in the Cashier →
        </button>
      )}
      {cantMatch && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-rose-300/80 text-center">
          Not enough chips to match this buy-in — you'll sit this round out.
        </p>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60 text-center">
        {MIN_BET}–{MAX_BET} chips · winner takes the whole pot
      </p>
    </div>
  );
}