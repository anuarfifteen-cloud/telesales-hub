import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Mode-scoped stats for Casino 21 records only.
export default function BlackjackStats({ userId }) {
  const { data: history = [] } = useQuery({
    queryKey: ["blackjack-history", userId],
    queryFn: () =>
      base44.entities.CoinFlipGame.filter({ user_id: userId, game_type: "blackjack" }, "-created_date", 100),
    enabled: !!userId,
  });

  const wins = history.filter((h) => h.result === "win").length;
  const losses = history.filter((h) => h.result === "loss").length;
  const pushes = history.filter((h) => h.result === "push").length;
  const total = history.length;
  const blackjacks = history.filter((h) => h.detail === "Blackjack!").length;
  const net = history.reduce((s, h) => s + (h.tokens_delta || 0), 0);
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const cells = [
    { label: "Rounds", value: total, color: "text-foreground" },
    { label: "Wins", value: wins, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Losses", value: losses, color: "text-red-600 dark:text-red-400" },
    { label: "Pushes", value: pushes, color: "text-slate-500" },
    { label: "Blackjacks", value: blackjacks, color: "text-amber-600 dark:text-amber-400" },
    { label: "Win rate", value: total > 0 ? `${winRate}%` : "—", color: "text-blue-600 dark:text-blue-400" },
    { label: "Net", value: net > 0 ? `+${net}` : net, color: net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      {cells.map((c) => (
        <div key={c.label} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1 border border-border">
          <span className={`text-xl font-black tabular-nums ${c.color}`}>{c.value}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
        </div>
      ))}
    </div>
  );
}