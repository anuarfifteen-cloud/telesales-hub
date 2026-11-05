import MiniChipIcon from "../MiniChipIcon";
import WagerPresets from "./WagerPresets";
import { canAffordStake, stakeLabel } from "@/lib/beatMyHand";

// Step one of both flows: pick the stake and lock it in. Cards are only dealt
// once this card is locked, so nothing is played before the wager is settled.
// `fixed` is used by the challenger, whose stake must match the posted wager.
// The stake's currency matters: a Diamond challenge is covered by the Diamond
// wallet, never by chips.
export default function WagerLockCard({
  wager,
  stakeType = "chips",
  chips,
  diamonds = 0,
  onChange,
  onLock,
  fixed = false,
  locked = false,
  hint,
  lockLabel,
}) {
  const affordable = canAffordStake({ casinoChips: chips, diamonds }, stakeType, wager);
  const showAmount = fixed || locked;

  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.06] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
          {locked ? "Wager locked" : "Step 1 · Lock your wager"}
        </p>
        <span className="flex items-center gap-2 text-[11px] font-bold text-amber-200 tabular-nums">
          <span className="flex items-center gap-1">
            <MiniChipIcon size={12} /> {Number(chips) || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] leading-none">💎</span> {Number(diamonds) || 0}
          </span>
        </span>
      </div>

      {showAmount ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-400/30 bg-emerald-950/40 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
            {fixed ? "Matched stake" : "Your stake"}
          </span>
          <span className="flex items-center gap-1.5">
            {stakeType === "diamond" ? (
              <span className="text-sm leading-none">💎</span>
            ) : (
              <MiniChipIcon size={14} />
            )}
            <span className="text-sm font-black text-amber-200 tabular-nums">{wager}</span>
          </span>
        </div>
      ) : (
        <WagerPresets
          value={wager}
          stakeType={stakeType}
          onChange={onChange}
          chips={chips}
          diamonds={diamonds}
        />
      )}

      {hint && <p className="text-[10px] text-emerald-100/50 leading-relaxed">{hint}</p>}

      {!locked && (
        <button
          onClick={onLock}
          disabled={!affordable}
          className="w-full py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-emerald-950 disabled:opacity-40"
          style={{ background: "#d4af37" }}
        >
          {affordable
            ? lockLabel || `Lock in ${stakeLabel(wager, stakeType)}`
            : stakeType === "diamond"
              ? "Not enough diamonds"
              : "Not enough chips"}
        </button>
      )}
    </div>
  );
}