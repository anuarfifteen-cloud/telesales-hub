import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Ticket, Gem } from "lucide-react";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "redeemed", label: "Redeemed" },
];

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminVoucherLog() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    const data = await base44.entities.Voucher.list("-created_at", 200);
    setVouchers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Voucher.subscribe(() => load());
    return unsub;
  }, []);

  const filtered = vouchers.filter((v) => {
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      (v.user_name || "").toLowerCase().includes(q) ||
      (v.code || "").toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const counts = {
    all: vouchers.length,
    active: vouchers.filter((v) => v.status === "active").length,
    redeemed: vouchers.filter((v) => v.status === "redeemed").length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === t.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t.label}
            </p>
            <p className="text-2xl font-black text-foreground tabular-nums">
              {counts[t.id]}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code or name…"
          className="w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No vouchers found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((v) => {
            const isDiamond = v.reward_tokens === 999;
            return (
              <div
                key={v.id}
                className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    isDiamond
                      ? "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300"
                      : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300"
                  }`}
                >
                  {isDiamond ? <Gem className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">
                      {v.user_name || "Unknown"}
                    </span>
                    <span className="font-mono text-[11px] font-black text-muted-foreground tracking-wider">
                      {v.code}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isDiamond
                      ? "💎 Diamond reward"
                      : `+${v.reward_tokens ?? 0} tokens`}{" "}
                    · Purchased {fmtDate(v.created_at)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.status === "redeemed"
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {v.status === "redeemed" ? "Redeemed" : "Active"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {v.status === "redeemed" ? timeAgo(v.updated_date) : ""}
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