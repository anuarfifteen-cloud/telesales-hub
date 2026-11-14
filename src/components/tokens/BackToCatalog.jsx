import { ArrowLeft } from "lucide-react";

/** Header shown above an opened game, returning to the catalog. */
export default function BackToCatalog({ title, onBack }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <ArrowLeft size={13} strokeWidth={2.6} />
        All games
      </button>
      {title ? (
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{title}</span>
      ) : null}
    </div>
  );
}