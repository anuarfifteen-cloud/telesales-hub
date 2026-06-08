import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Search } from "lucide-react";

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function AdminTokenAuditLog() {
  const [search, setSearch] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["tokenTransactions"],
    queryFn: () => base44.entities.TokenTransaction.list("-timestamp", 200),
    refetchInterval: 30000,
  });

  const filtered = search.trim()
    ? transactions.filter(t =>
        (t.user_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by user name…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Earned</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
            +{filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Total Spent</p>
          <p className="text-lg font-black text-red-600 dark:text-red-400">
            {filtered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}{search ? ` for "${search}"` : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {search ? "No records match that name." : "No token transactions yet."}
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {filtered.map((t, i) => {
              const isPositive = t.amount > 0;
              return (
                <div key={t.id || i} className="px-4 py-3 flex items-start gap-3">
                  {/* Movement badge */}
                  <div className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                    isPositive
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  }`}>
                    {isPositive ? `+${t.amount}` : t.amount}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{t.user_name}</p>
                      <p className="text-[10px] text-muted-foreground flex-shrink-0">{formatTimestamp(t.timestamp)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.source}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}