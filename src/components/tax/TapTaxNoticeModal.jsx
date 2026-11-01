import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TaxNoticeMonth from "./TaxNoticeMonth";

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
 * Shows every unacknowledged monthly TAP tax notice, combined into one summary.
 * Amounts come from the values saved during the tax run, never recalculated.
 */
export default function TapTaxNoticeModal({ user }) {
  const [notices, setNotices] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    base44.entities.TapTaxNotice
      .filter({ user_id: user.id, acknowledged: false })
      .then((rows) => {
        if (!active) return;
        const sorted = [...rows].sort((a, b) => (a.tax_month || "").localeCompare(b.tax_month || ""));
        setNotices(sorted.length ? sorted : null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  const pending = notices || [];
  const totalTax = pending.reduce((s, n) => s + (Number(n.total_tax) || 0), 0);
  const startBalance = pending[0]?.pre_tax_balance ?? 0;
  const endBalance = pending[pending.length - 1]?.post_tax_balance ?? 0;

  const taxShown = useCountUp(0, totalTax);
  const balanceShown = useCountUp(startBalance, endBalance);

  const handleUnderstood = async () => {
    setSaving(true);
    const stamp = new Date().toISOString();
    try {
      await base44.entities.TapTaxNotice.bulkUpdate(
        pending.map((n) => ({ id: n.id, acknowledged: true, acknowledged_at: stamp }))
      );
      setNotices(null);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={pending.length > 0}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader className="items-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-1 text-2xl">
            🏦
          </div>
          <AlertDialogTitle className="text-lg text-center">
            🏦 Monthly TAP Tax Processed
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
          {pending.length > 1 && (
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Combined across {pending.length} months
            </p>
          )}
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-0.5">
          {pending.map((n) => (
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
          onClick={handleUnderstood}
          disabled={saving}
          className="w-full rounded-lg px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Understood"}
        </button>
      </AlertDialogContent>
    </AlertDialog>
  );
}