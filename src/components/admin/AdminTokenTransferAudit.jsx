import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, RefreshCw, Ticket, CheckCircle2, Clock } from "lucide-react";

const BRUNEI_TZ = "Asia/Brunei";
const VOUCHER_MONTHLY_CAP = 50;

const ACTIVE_RE = /^VOUCHER_ACTIVE:(VCH-.+)$/;
const CLAIMED_RE = /^VOUCHER_CLAIMED:(VCH-.+)_BY_(.+)$/;

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Not Yet" },
  { id: "redeemed", label: "Redeemed" },
];

function bruneiMonthKey(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // Use Asia/Brunei formatting via Intl to get local year/month
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRUNEI_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value || "";
  const m = parts.find((p) => p.type === "month")?.value || "";
  return `${y}-${m}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRUNEI_TZ,
  });
}

function displayName(name, email) {
  if (name && name.trim()) return name;
  if (email) return email.split("@")[0];
  return "Unknown";
}

export default function AdminTokenTransferAudit() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TokenTransaction.list("-created_date", 2000);
      setTxs(data || []);
    } catch {
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reconstruct vouchers from transactions
  const vouchers = useMemo(() => {
    const claimedByCode = new Map();
    const activeByCode = new Map();

    (txs || []).forEach((t) => {
      const src = t.source || "";
      let m = src.match(CLAIMED_RE);
      if (m) {
        const [, code, by] = m;
        // keep the latest claimed record if multiple
        const existing = claimedByCode.get(code);
        if (!existing || new Date(t.timestamp || 0) > new Date(existing.timestamp || 0)) {
          claimedByCode.set(code, { by, timestamp: t.timestamp });
        }
        return;
      }
      m = src.match(ACTIVE_RE);
      if (m) {
        const code = m[1];
        const existing = activeByCode.get(code);
        if (!existing || new Date(t.timestamp || 0) > new Date(existing.timestamp || 0)) {
          activeByCode.set(code, t);
        }
      }
    });

    const list = [];
    activeByCode.forEach((t, code) => {
      const claim = claimedByCode.get(code);
      list.push({
        code,
        issuerName: displayName(t.user_name, undefined),
        amount: Math.abs(Number(t.amount) || 0),
        issuedAt: t.timestamp,
        claimed: !!claim,
        claimedBy: claim ? claim.by : null,
        claimedAt: claim ? claim.timestamp : null,
      });
    });
    list.sort((a, b) => (b.issuedAt || "").localeCompare(a.issuedAt || ""));
    return list;
  }, [txs]);

  const currentMonth = bruneiMonthKey(new Date().toISOString());

  // Top counts
  const totalIssued = vouchers.length;
  const totalRedeemed = vouchers.filter((v) => v.claimed).length;
  const totalNotYet = totalIssued - totalRedeemed;

  // Per-issuer monthly summary (cap tracking)
  const monthlyByIssuer = useMemo(() => {
    const map = new Map();
    vouchers.forEach((v) => {
      if (bruneiMonthKey(v.issuedAt) === currentMonth) {
        const cur = map.get(v.issuerName) || 0;
        map.set(v.issuerName, cur + v.amount);
      }
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [vouchers, currentMonth]);

  const totalGiftedThisMonth = monthlyByIssuer.reduce((s, r) => s + r.amount, 0);

  // Filtered list
  const filtered = vouchers.filter((v) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "redeemed" && v.claimed) ||
      (statusFilter === "active" && !v.claimed);
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      (v.issuerName || "").toLowerCase().includes(q) ||
      (v.code || "").toLowerCase().includes(q) ||
      (v.claimedBy || "").toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const summaryCards = [
    { label: "Issued", value: totalIssued },
    { label: "Redeemed", value: totalRedeemed },
    { label: "Not Yet", value: totalNotYet },
    { label: "Gifted (mo)", value: totalGiftedThisMonth },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-500" /> VCH Token Transfer Audit
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Every gift voucher issued from the Profile tab — issuer, code, amount, and redemption status.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Top counts */}
      <div className="grid grid-cols-4 gap-2">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {c.label}
            </p>
            <p className="text-2xl font-black text-foreground tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Per-issuer monthly cap summary */}
      {monthlyByIssuer.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Monthly Cap Tracker (50/month)
          </p>
          <div className="flex flex-col gap-1.5">
            {monthlyByIssuer.map((r) => {
              const pct = Math.min(100, Math.round((r.amount / VOUCHER_MONTHLY_CAP) * 100));
              return (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground w-32 truncate">{r.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground w-20 text-right">
                    {r.amount} / {VOUCHER_MONTHLY_CAP}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div className="grid grid-cols-3 gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`w-full py-2 rounded-xl text-[11px] font-bold transition-all border text-center ${
              statusFilter === t.id
                ? "bg-primary text-primary-foreground border-primary shadow"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by issuer, code, or claimer…"
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
          <p className="text-sm text-muted-foreground">No token transfers found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((v) => (
            <div
              key={v.code}
              className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  v.claimed
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                }`}
              >
                {v.claimed ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">{v.issuerName}</span>
                  <span className="font-mono text-[11px] font-black text-muted-foreground tracking-wider">
                    {v.code}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  +{v.amount} tokens · Issued {fmtDate(v.issuedAt)}
                  {v.claimed
                    ? ` · Claimed by ${v.claimedBy || "—"}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.claimed
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {v.claimed ? "Redeemed" : "Not Yet"}
                </span>
                {v.claimed && (
                  <span className="text-[10px] text-muted-foreground">{fmtDate(v.claimedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}