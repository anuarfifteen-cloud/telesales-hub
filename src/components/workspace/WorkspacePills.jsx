import { PILL_ACTIVE, PILL_IDLE } from "./workspaceStyles";

/** Option pills: the active one fills with the theme's primary colour. */
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
              active ? PILL_ACTIVE : PILL_IDLE
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}