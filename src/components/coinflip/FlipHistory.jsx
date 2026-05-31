import { format } from "date-fns";

export default function FlipHistory({ history }) {
  if (!history.length) return null;

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border p-4">
      <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-3">📜 Flip History</p>
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {history.map((flip) => (
          <div
            key={flip.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
              flip.result === "win"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{flip.result === "win" ? "✅" : "❌"}</span>
              <span className="text-muted-foreground">
                Picked <strong>{flip.choice}</strong> → landed <strong>{flip.outcome}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`font-bold ${flip.result === "win" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {flip.tokens_delta > 0 ? "+" : ""}{flip.tokens_delta}🪙
              </span>
              <span className="text-muted-foreground text-[10px]">
                {format(new Date(flip.created_date), "HH:mm")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}