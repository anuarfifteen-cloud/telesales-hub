import { GOLD_BG } from "./workspaceStyles";

/** Navy pills with the active option filled in gold. */
export default function WorkspacePills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition ${
              active
                ? "text-[#20180a] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.9)]"
                : "border border-[#d4af37]/30 bg-[#0d1740] text-[#e9cf8f] hover:border-[#d4af37]/60"
            }`}
            style={active ? GOLD_BG : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}