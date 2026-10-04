import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Ticket, Gem, Send, CheckCircle2, Clock } from "lucide-react";
import { resolveVoucherReward, voucherRewardText } from "@/lib/voucherReward";

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

export default function AdminVoucherOut() {
  const [vouchers, setVouchers] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    const data = await base44.entities.Voucher.list("-created_at", 200);
    setVouchers(data);
    setLoading(false);
  };

  const loadUsers = async () => {
    const rows = await base44.entities.User.list();
    const map = {};
    for (const u of rows) map[u.id] = u.full_name || u.email?.split("@")[0] || "Unknown";
    setUsers(map);
  };

  useEffect(() => {
    load();
    loadUsers();
    const unsub = base44.entities.Voucher.subscribe(() => load());
    return unsub;
  }, []);

  const counts = useMemo(
    () => ({
      total: vouchers.length,
      redeemed: vouchers.filter((v) => v.status === "redeemed").length,
      awaiting: vouchers.filter((v) => v.status === "active").length,
    }),
    [vouchers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vouchers;
    return vouchers.filter((v) => {
      const issuer = users[v.created_by_id] || "";
      return (
        (v.user_name || "").toLowerCase().includes(q) ||
        (v.code || "").toLowerCase().includes(q) ||
        issuer.toLowerCase().includes(q)
      );
    });
  }, [vouchers, users, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Issued</p>
          <p className="text-2xl font-black text-foreground tabular-nums">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Redeemed</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{counts.redeemed}</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Awaiting</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">{counts.awaiting}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by issuer, recipient, or code…"
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
            const isDiamond = resolveVoucherReward(v).type === "diamond";
            const isRedeemed = v.status === "redeemed";
            const issuerName = users[v.created_by_id] || "—";
            return (
              <div
                key={v.id}
                className="bg-card rounded-xl border border-border p-3 flex flex-col gap-2.5"
              >
                {/* Top row: reward icon + code */}
                <div className="flex items-center gap-3">
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
                    <span className="font-mono text-sm font-black text-foreground tracking-wider">{v.code}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      +{voucherRewardText(v)} · Issued {fmtDate(v.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${
                      isRedeemed
                        ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {isRedeemed ? <><CheckCircle2 className="w-3 h-3" /> Redeemed</> : <><Clock className="w-3 h-3" /> Awaiting</>}
                  </span>
                </div>

                {/* Issued By / Redeemed By row */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 pt-2">
                    <Send className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Issued By</p>
                      <p className="text-xs font-semibold text-foreground truncate">{issuerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2">
                    {isRedeemed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isRedeemed ? "Redeemed By" : "Awaiting Claim By"}
                      </p>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {v.user_name || "Unknown"}
                        {isRedeemed && <span className="text-[10px] text-muted-foreground font-normal"> · {timeAgo(v.updated_date)}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}