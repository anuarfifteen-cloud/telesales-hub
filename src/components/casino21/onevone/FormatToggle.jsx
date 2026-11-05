// Pick the match shape before the stake is locked. Both formats cost the
// player exactly one stake — three hands never multiply the wager.
const OPTIONS = [
  { id: "standard", label: "1 Hand", sub: "Standard" },
  { id: "best_of_3", label: "Best of 3", sub: "3 hands each" },
];

export default function FormatToggle({ value = "standard", onChange, disabled = false }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.06] p-3 flex flex-col gap-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
        Match format
      </p>

      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange?.(option.id)}
              disabled={disabled}
              className={`rounded-lg px-2 py-2 text-center transition-colors disabled:opacity-40 ${
                active
                  ? "border border-amber-400/60 bg-amber-400/20"
                  : "border border-white/12 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              <span
                className={`block text-[11px] font-black uppercase tracking-widest ${
                  active ? "text-amber-200" : "text-emerald-100/70"
                }`}
              >
                {option.label}
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-emerald-100/40 mt-0.5">
                {option.sub}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-emerald-100/50 leading-relaxed">
        {value === "best_of_3"
          ? "Three hands each, played one after another. Most hand wins takes the pot; equal hand wins refunds both stakes. Still one stake per player."
          : "One hand each — the higher hand takes the pot."}
      </p>
    </div>
  );
}