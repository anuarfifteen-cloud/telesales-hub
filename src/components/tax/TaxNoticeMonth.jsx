const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();

function monthLabel(month) {
  const [y, m] = (month || "").split("-").map(Number);
  if (!y || !m) return month || "";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** One month's saved tax breakdown, read exactly as it was applied at run time. */
export default function TaxNoticeMonth({ notice }) {
  const rows = [
    { label: "Total Tax Deducted", value: `-${fmt(notice.total_tax)} Tokens`, tone: "text-amber-600 dark:text-amber-400" },
    { label: "Moved to TAP Vault (80%)", value: `+${fmt(notice.vault_deposit)} Tokens`, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Hub Treasury (20%)", value: `${fmt(notice.treasury_share)} Tokens`, tone: "text-slate-600 dark:text-slate-400" },
    { label: "Active Balance", value: `${fmt(notice.pre_tax_balance)} → ${fmt(notice.post_tax_balance)} Tokens`, tone: "text-foreground" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        {monthLabel(notice.tax_month)}
      </p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-muted-foreground">{r.label}</span>
            <span className={`text-xs font-bold tabular-nums text-right ${r.tone}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}