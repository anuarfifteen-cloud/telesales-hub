import MiniChipIcon from "../MiniChipIcon";
import { WAGER_PRESETS } from "@/lib/beatMyHand";

// Fixed chip wagers. Anything above the player's balance is disabled rather
// than hidden, so the ladder always reads the same.
export default function WagerPresets({ value, onChange, chips, disabled = false }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70 mb-2">
        Wager
      </p>
      <div className="grid grid-cols-5 gap-2">
        {WAGER_PRESETS.map((amount) => {
          const affordable = chips >= amount;
          const active = value === amount;
          return (
            <button
              key={amount}
              onClick={() => onChange(amount)}
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
    </div>
  );
}