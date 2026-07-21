import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Filter, X } from "lucide-react";

export default function AdminCoinFlipLogs() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    base44.entities.CoinFlipGame.list("-created_date", 500)
      .then((rows) => setRecords(rows || []))
      .catch((e) => console.error("Failed to load coin flip logs:", e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    const matchDate = !dateFilter
      ? true
      : (r.created_date || "").startsWith(dateFilter);
    const matchName = !nameFilter
      ? true
      : (r.user_email || "").toLowerCase().includes(nameFilter.toLowerCase());
    return matchDate && matchName;
  });

  const totalFlips = filtered.length;
  const wins = filtered.filter((r) => r.result === "win");
  const losses = filtered.filter((r) => r.result === "loss");
  const totalWon = wins.reduce((sum, r) => sum + (r.wager || 0), 0);
  const totalLost = losses.reduce((sum, r) => sum + (r.wager || 0), 0);

  const clearFilters = () => {
    setDateFilter("");
    setNameFilter("");
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Flips</p>
          <p className="text-lg font-black text-foreground tabular-nums">{totalFlips}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800 p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-green-700 dark:text-green-400 tracking-widest">Wins</p>
          <p className="text-lg font-black text-green-700 dark:text-green-400 tabular-nums">{wins.length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-red-700 dark:text-red-400 tracking-widest">Losses</p>
          <p className="text-lg font-black text-red-700 dark:text-red-400 tabular-nums">{losses.length}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-widest">Tokens Won</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">+{totalWon}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-400 tracking-widest">Tokens Lost</p>
          <p className="text-lg font-black text-orange-700 dark:text-orange-400 tabular-nums">-{totalLost}</p>
        </div>
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
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Player Name</p>
          <input
            type="text"
            placeholder="Search by email…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          onClick={clearFilters}
          className="px-4 py-2 rounded-lg border border-border bg-muted text-foreground text-xs font-bold hover:bg-muted/70 flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Clear Filters
        </button>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">No records found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((flip) => {
            const isWin = flip.result === "win";
            const playerName = (flip.user_email || "").split("@")[0] || "Unknown";
            return (
              <div
                key={flip.id}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
                  isWin
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40"
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="font-bold text-foreground truncate">{playerName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Chose {flip.choice} · Landed {flip.outcome} · Wager {flip.wager}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-widest ${isWin ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                    {isWin ? "✅ Win" : "❌ Loss"}
                  </span>
                  <span className={`font-black text-sm tabular-nums ${isWin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {flip.tokens_delta > 0 ? "+" : ""}{flip.tokens_delta}
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