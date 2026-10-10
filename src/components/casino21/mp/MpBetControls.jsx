import MiniChipIcon from "../MiniChipIcon";
import { MIN_BET, MAX_BET } from "./mpEngine";

// Wager picker for the betting phase. The slider can never exceed the player's
// balance or the table maximum, so a bet is always affordable.
export default function MpBetControls({ bet, setBet, chips, busy, onPlace, onOpenCashier }) {
  const balance = Number(chips) || 0;
  const maxAffordable = Math.max(MIN_BET, Math.min(MAX_BET, balance));
  const value = Math.min(Math.max(bet, MIN_BET), maxAffordable);
  const tooPoor = balance < MIN_BET;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBet(Math.max(MIN_BET, value - 1))}
          disabled={tooPoor || value <= MIN_BET}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
        >
          ‹
        </button>
        <input
          type="range"
          min={MIN_BET}
          max={maxAffordable}
          step={1}
          value={value}
          onChange={(e) => setBet(Number(e.target.value))}
          disabled={tooPoor}
          className="flex-1 accent-amber-400"
        />
        <button
          onClick={() => setBet(Math.min(maxAffordable, value + 1))}
          disabled={tooPoor || value >= maxAffordable}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
          <MiniChipIcon size={14} />
          {value} CHIPS
        </span>
        <button
          onClick={() => setBet(maxAffordable)}
          disabled={tooPoor}
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          Max
        </button>
      </div>

      <button
        onClick={() => onPlace(value)}
        disabled={tooPoor || busy}
        className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
        style={{ background: "#d4af37" }}
      >
        Place {value} Chip Bet
      </button>

      {tooPoor && (
        <button
          onClick={onOpenCashier}
          className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
        >
          You need {MIN_BET} chip to play — buy chips in the Cashier →
        </button>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60 text-center">
        {MIN_BET}–{MAX_BET} chips · blackjack pays 3:2 · win pays 1:1
      </p>
    </div>
  );
}