import MiniChipIcon from "../MiniChipIcon";

// Sits at the very top of Beat My Hand so the player always knows what the
// posting or accepting side can afford before committing to a wager. Both
// wallets show, because a Diamond challenge is covered by Diamonds only.
export default function ChipBalanceStrip({ chips, diamonds = 0 }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/80">
        Your balance
      </span>
      <span className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <MiniChipIcon size={14} />
          <span className="text-sm font-black text-amber-200 tabular-nums">
            {Number(chips) || 0}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs leading-none">💎</span>
          <span className="text-sm font-black text-sky-200 tabular-nums">
            {Number(diamonds) || 0}
          </span>
        </span>
      </span>
    </div>
  );
}