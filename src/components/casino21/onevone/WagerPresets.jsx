import MiniChipIcon from "../MiniChipIcon";
import { WAGER_PRESETS, DIAMOND_WAGER } from "@/lib/beatMyHand";

// Fixed stakes. Anything above the player's wallet is disabled rather than
// hidden, so the ladder always reads the same. The Diamond tier is its own
// button underneath: it is a different currency, never a chip equivalent.
export default function WagerPresets({
  value,
  stakeType = "chips",
  onChange,
  chips,
  diamonds = 0,
  disabled = false,
}) {
  const diamondActive = stakeType === "diamond";
  const diamondAffordable = (Number(diamonds) || 0) >= DIAMOND_WAGER;

  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70 mb-2">
        Wager
      </p>
      <div className="grid grid-cols-4 gap-2">
        {WAGER_PRESETS.map((amount) => {
          const affordable = (Number(chips) || 0) >= amount;
          const active = !diamondActive && value === amount;
          return (
            <button
              key={amount}
              onClick={() => onChange(amount, "chips")}
              disabled={!affordable || disabled}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition ${
                active
                  ? "bg-amber-400 border-amber-200 text-emerald-950"
                  : "bg-white/5 border-white/15 text-amber-100 hover:bg-white/10"
              } ${!affordable ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <MiniChipIcon size={14} />
              <span className="text-xs font-black tabular-nums">{amount}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange(DIAMOND_WAGER, "diamond")}
        disabled={!diamondAffordable || disabled}
        className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl border transition ${
          diamondActive
            ? "bg-sky-300 border-sky-100 text-emerald-950"
            : "bg-sky-400/10 border-sky-300/30 text-sky-100 hover:bg-sky-400/15"
        } ${!diamondAffordable ? "opacity-30 cursor-not-allowed" : ""}`}
      >
        <span className="text-sm leading-none">💎</span>
        <span className="text-xs font-black uppercase tracking-widest">1 Diamond</span>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
          High roller
        </span>
      </button>
    </div>
  );
}