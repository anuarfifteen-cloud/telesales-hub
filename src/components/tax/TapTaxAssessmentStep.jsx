import { ArrowRight } from "lucide-react";
import {
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { monthLabel } from "./TaxNoticeMonth";

/** Step 1 — plain-language context only. No figures, no animations. */
export default function TapTaxAssessmentStep({ notices, onNext }) {
  const months = notices.map((n) => n.tax_month).filter(Boolean).sort();
  const first = months[0];
  const last = months[months.length - 1];
  const label =
    months.length > 1
      ? `${monthLabel(first)} – ${monthLabel(last)}`
      : monthLabel(first);

  return (
    <>
      <AlertDialogHeader className="items-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-1 text-3xl">
          🏦
        </div>
        <AlertDialogTitle className="text-lg text-center leading-snug">
          🏦 {label} TAP Assessment
        </AlertDialogTitle>
      </AlertDialogHeader>

      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        The TAP Savings system is an automatic, once-a-month progressive wealth tax.
        Each assessment moves a share of your active tokens into your TAP Savings Vault,
        with a smaller share going to the Hub Treasury.
      </p>

      <p className="text-xs text-muted-foreground text-center">
        This has already been applied to your balance. Next, you'll see the exact
        breakdown for {months.length > 1 ? "each month" : "the month"} above.
      </p>

      {months.length > 1 && (
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
          {months.length} monthly assessments
        </p>
      )}

      <button
        onClick={onNext}
        className="w-full rounded-lg px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
      >
        View Breakdown <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
}