import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MiniChipIcon from "./MiniChipIcon";

// Mode-scoped history for Blackjack 21 records only (chip-based rounds).
export default function BlackjackHistory({ userId }) {
  const { data: history = [] } = useQuery({
    queryKey: ["blackjack-history", userId],
    queryFn: () =>
      base44.entities.CoinFlipGame.filter({ user_id: userId, game_type: "blackjack" }, "-created_date", 30),
    enabled: !!userId,
  });

  if (history.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-sm">No rounds yet.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Deal your first hand to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 p-1">
      {history.map((r) => {
        const winChips =
          r.result === "win"
            ? r.detail === "Blackjack!"
              ? Math.round((r.wager || 0) * 2.5)
              : (r.wager || 0) * 2
            : 0;
        return (
          <div
            key={r.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs border ${
              r.result === "win"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
                : r.result === "push"
                ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <MiniChipIcon size={14} />
              <span className="text-foreground/80">
                Bet <strong className="text-foreground">{r.wager}</strong> chips
              </span>
              {r.detail && <span className="text-muted-foreground">· {r.detail}</span>}
            </div>
            <span
              className={`font-bold text-sm tabular-nums flex items-center gap-1 ${
                r.result === "win"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : r.result === "loss"
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500"
              }`}
            >
              {r.result === "win" ? (
                <>+{winChips} <MiniChipIcon size={12} /></>
              ) : r.result === "loss" ? (
                <>−{r.wager} <MiniChipIcon size={12} /></>
              ) : (
                <>Refunded {r.wager} <MiniChipIcon size={12} /></>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}