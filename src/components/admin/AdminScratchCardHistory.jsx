import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Filter, X } from "lucide-react";

/** Admin history of every Scratch Card ticket bought, and what it won. */
export default function AdminScratchCardHistory() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["scratchCardLogs"],
    queryFn: () => base44.entities.ScratchCardLog.list("-created_date", 500),
  });

  // Keep the history current while players buy and scratch tickets.
  useEffect(() => {
    const unsubscribe = base44.entities.ScratchCardLog.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["scratchCardLogs"] })
    );
    return unsubscribe;
  }, [queryClient]);

  const uniqueUsers = [...new Set(records.map((r) => r.user_email).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  const filtered = records.filter((r) => {
    const stamp = r.timestamp || r.created_date || "";
    const matchDate = !dateFilter ? true : stamp.startsWith(dateFilter);
    const matchUser = !selectedUser ? true : (r.user_email || "") === selectedUser;
    return matchDate && matchUser;
  });

  const wins = filtered.filter((r) => r.outcome === "win");
  const losses = filtered.filter((r) => r.outcome === "loss");
  const tokensSpent = filtered.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const sumPrize = (type) =>
    filtered
      .filter((r) => r.prize_type === type)
      .reduce((sum, r) => sum + (Number(r.prize_amount) || 0), 0);
  const themesWon = filtered.filter((r) => r.prize_type === "theme").length;

  const clearFilters = () => {
    setDateFilter("");
    setSelectedUser("");
  };

  const stats = [
    { label: "Tickets Bought", value: filtered.length, tone: "text-foreground" },
    { label: "Tokens Spent", value: `-${tokensSpent}`, tone: "text-orange-600 dark:text-orange-400" },
    { label: "Wins", value: wins.length, tone: "text-green-600 dark:text-green-400" },
    { label: "No Match", value: losses.length, tone: "text-red-600 dark:text-red-400" },
    { label: "Chips Won", value: `+${sumPrize("chips")}`, tone: "text-amber-600 dark:text-amber-400" },
    { label: "Tokens Won", value: `+${sumPrize("tokens")}`, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Diamonds Won", value: `+${sumPrize("diamond")}`, tone: "text-sky-600 dark:text-sky-400" },
    { label: "Themes Won", value: themesWon, tone: "text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{s.label}</p>
            <p className={`text-lg font-black tabular-nums ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Date</p>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Player</p>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">All users</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <button
          onClick={clearFilters}
          className="px-4 py-2 rounded-lg border border-border bg-muted text-foreground text-xs font-bold hover:bg-muted/70 flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Clear Filters
        </button>
      </div>

      {/* Tickets */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">No tickets bought yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((ticket) => {
            const isWin = ticket.outcome === "win";
            const playerName = ticket.user_name || (ticket.user_email || "").split("@")[0] || "Unknown";
            return (
              <div
                key={ticket.id}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
                  isWin
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="font-bold text-foreground truncate">{playerName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                    Bought for {ticket.cost} tokens
                    {ticket.timestamp ? ` · ${new Date(ticket.timestamp).toLocaleString()}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className={`font-black text-sm ${isWin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {isWin ? ticket.prize_label || "Win" : "No Match"}
                    </p>
                    {isWin && !ticket.collected && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Not scratched yet</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-widest ${isWin ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                    {isWin ? "✅ Win" : "❌ Loss"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}