import { useEffect, useState } from "react";
import {
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TaxNoticeMonth, { monthLabel } from "./TaxNoticeMonth";

const ANIM_MS = 2500;
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();

/** Eases from `from` to `to` over ANIM_MS, so the balance can visibly tick down. */
function useCountUp(from, to) {
  const [value, setValue] = useState(Number(from) || 0);

  useEffect(() => {
    const start = Number(from) || 0;
    const end = Number(to) || 0;
    let raf = null;
    let startedAt = null;
    const step = (t) => {
      if (startedAt === null) startedAt = t;
      const progress = Math.min((t - startedAt) / ANIM_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    setValue(start);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);

  return value;
}

/**
 * Step 2 — the saved figures, with the rolling count animations. Mounts only
 * after the context step so the numbers animate on entry, never behind it.
 */
export default function TapTaxBreakdownStep({ notices, saving, onUnderstood }) {
  const totalTax = notices.reduce((s, n) => s + (Number(n.total_tax) || 0), 0);
  const startBalance = notices[0]?.pre_tax_balance ?? 0;
  const endBalance = notices[notices.length - 1]?.post_tax_balance ?? 0;

  const taxShown = useCountUp(0, totalTax);
  const balanceShown = useCountUp(startBalance, endBalance);

  const months = notices.map((n) => n.tax_month).filter(Boolean).sort();
  const label =
    months.length > 1
      ? `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}`
      : monthLabel(months[0]);

  return (
    <>
      <AlertDialogHeader className="items-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-1 text-2xl">
          🏦
        </div>
        <AlertDialogTitle className="text-lg text-center leading-snug">
          {label} Breakdown
        </AlertDialogTitle>
        <p className="text-sm text-muted-foreground text-center mt-1 leading-relaxed">
          Your active tokens were taxed according to the progressive wealth brackets.
        </p>
      </AlertDialogHeader>

      <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Total Tax Deducted
        </p>
        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
          {fmt(taxShown)} Tokens
        </p>
        {notices.length > 1 && (
          <p className="text-[11px] font-medium text-muted-foreground mt-1">
            Combined across {notices.length} months
          </p>
        )}
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-0.5">
        {notices.map((n) => (
          <TaxNoticeMonth key={n.id} notice={n} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Active Balance</span>
          <span className="text-sm font-black text-foreground tabular-nums">
            {fmt(balanceShown)} Tokens
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-0.5 tabular-nums">
          {fmt(startBalance)} → {fmt(endBalance)}
        </p>
      </div>

      <button
        onClick={onUnderstood}
        disabled={saving}
        className="w-full rounded-lg px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {saving ? "Saving…" : "Understood"}
      </button>
    </>
  );
}