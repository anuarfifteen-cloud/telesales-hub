import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Drawer listing archived seasons and their champions. */
export default function SeasonHistoryDrawer({ open, onClose, history = [] }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Previous seasons">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xs flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Archive</p>
            <h3 className="text-sm font-black text-foreground">Previous seasons</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {history.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] font-semibold text-muted-foreground">
              No completed seasons yet. The first season is still running.
            </p>
          )}

          {history.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-black text-foreground">Season {item.season_number}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.final_day || "—"}
                </p>
              </div>
              <p className="mt-1 truncate text-[11px] font-bold text-amber-600">
                🏆 {item.champion_name || "No champion"} · {Number(item.champion_points) || 0} pts
              </p>
              <div className="mt-1.5 space-y-0.5">
                {(item.standings || []).slice(0, 3).map((row) => (
                  <p key={`${item.id}-${row.user_id}`} className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                    <span className="truncate">
                      {row.rank}. {row.user_name}
                    </span>
                    <span className="tabular-nums">{row.points} pts</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}