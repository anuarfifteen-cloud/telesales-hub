const TABS = [
  { id: "derby", label: "Daily Derby" },
  { id: "leaderboard", label: "Leaderboard" },
];

/** Segmented switch at the top of the Horse Betting view. */
export default function DerbyTabs({ tab, onChange }) {
  return (
    <div className="flex gap-1 rounded-full border border-border bg-muted/60 p-1">
      {TABS.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          aria-selected={tab === item.id}
          className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${
            tab === item.id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}