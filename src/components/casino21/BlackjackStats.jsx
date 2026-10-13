import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// All-time Blackjack stats, split by mode.
//   Casual  → detail does NOT start with "Ranked"
//   Ranked  → detail starts with "Ranked"
// Both modes are logged in CoinFlipGame with game_type "blackjack"; the detail
// prefix is the reliable mode discriminator across all recorded rounds.
//
// Totals come from the server (aggregate groupBy result + a blackjack count),
// never a capped page fetched into the browser — so these are true all-time
// numbers, not the old 100-round snapshot.
async function loadStats(userId, modeKey) {
  const ranked = modeKey === "ranked";
  const baseQuery = {
    user_id: userId,
    game_type: "blackjack",
    detail: ranked ? { $regex: "^Ranked" } : { $not: { $regex: "^Ranked" } },
  };
  const bjQuery = {
    user_id: userId,
    game_type: "blackjack",
    detail: ranked ? { $regex: "^Ranked.*BLACKJACK" } : { $regex: "^BLACKJACK" },
  };
  const [agg, blackjacks] = await Promise.all([
    base44.entities.CoinFlipGame.aggregate({
      query: baseQuery,
      groupBy: "result",
      sum: "tokens_delta",
    }),
    base44.entities.CoinFlipGame.count(bjQuery),
  ]);
  const rows = agg?.rows || [];
  const by = (r) => rows.find((x) => x.result === r) || { count: 0, sum_tokens_delta: 0 };
  const wins = by("win").count;
  const losses = by("loss").count;
  const pushes = by("push").count;
  const total = wins + losses + pushes;
  const net = rows.reduce((s, r) => s + (Number(r.sum_tokens_delta) || 0), 0);
  return { total, wins, losses, pushes, blackjacks, net };
}

export default function BlackjackStats({ userId }) {
  const [mode, setMode] = useState("casual");

  const { data, isLoading } = useQuery({
    queryKey: ["blackjack-stats", userId, mode],
    queryFn: () => loadStats(userId, mode),
    enabled: !!userId,
  });

  const total = data?.total ?? 0;
  const wins = data?.wins ?? 0;
  const losses = data?.losses ?? 0;
  const pushes = data?.pushes ?? 0;
  const blackjacks = data?.blackjacks ?? 0;
  const net = data?.net ?? 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const cells = [
    { label: "Rounds", value: total, color: "text-foreground" },
    { label: "Wins", value: wins, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Losses", value: losses, color: "text-red-600 dark:text-red-400" },
    { label: "Pushes", value: pushes, color: "text-slate-500" },
    { label: "Blackjacks", value: blackjacks, color: "text-amber-600 dark:text-amber-400" },
    { label: "Win rate", value: total > 0 ? `${winRate}%` : "—", color: "text-blue-600 dark:text-blue-400" },
    { label: "Net tokens", value: net > 0 ? `+${net}` : net, color: net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Casual / Ranked mode tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded-2xl">
        {[
          ["casual", "🎮 CASUAL"],
          ["ranked", "🏆 RANKED"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
              mode === id
                ? "bg-background text-foreground border border-border shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-1">
          {cells.map((c) => (
            <div key={c.label} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1 border border-border">
              <span className={`text-xl font-black tabular-nums ${c.color}`}>{c.value}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground px-2">
        All-time {mode === "ranked" ? "Ranked" : "Casual"} totals across every recorded round.
      </p>
    </div>
  );
}