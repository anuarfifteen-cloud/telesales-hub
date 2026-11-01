import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import TapTaxAssessmentStep from "./TapTaxAssessmentStep";
import TapTaxBreakdownStep from "./TapTaxBreakdownStep";

/**
 * Two-step TAP notice: step 1 explains the monthly progressive tax and names the
 * assessed month, step 2 reveals the saved figures with the rolling animations.
 * Amounts come from the values saved during the tax run, never recalculated.
 */
export default function TapTaxNoticeModal({ user }) {
  const [notices, setNotices] = useState(null);
  const [step, setStep] = useState("context");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    base44.entities.TapTaxNotice
      .filter({ user_id: user.id, acknowledged: false })
      .then((rows) => {
        if (!active) return;
        const sorted = [...rows].sort((a, b) => (a.tax_month || "").localeCompare(b.tax_month || ""));
        if (sorted.length) setStep("context");
        setNotices(sorted.length ? sorted : null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  const pending = notices || [];

  const handleUnderstood = async () => {
    setSaving(true);
    const stamp = new Date().toISOString();
    try {
      await base44.entities.TapTaxNotice.bulkUpdate(
        pending.map((n) => ({ id: n.id, acknowledged: true, acknowledged_at: stamp }))
      );
      setNotices(null);
      setStep("context");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={pending.length > 0}>
      <AlertDialogContent className="max-w-[420px]">
        {step === "context" ? (
          <TapTaxAssessmentStep
            notices={pending}
            onNext={() => setStep("breakdown")}
          />
        ) : (
          <TapTaxBreakdownStep
            notices={pending}
            saving={saving}
            onUnderstood={handleUnderstood}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}