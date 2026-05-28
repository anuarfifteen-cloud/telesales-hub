import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function EarlyAccessToggle({ user, onUserUpdate }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const tokens = user?.earlyAccessTokens ?? 0;
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const isVipActive = vipExpiresAt && vipExpiresAt.getTime() > Date.now();
  const canActivate = tokens > 0 && !isVipActive;

  const handleActivate = async () => {
    setSaving(true);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.auth.updateMe({
      earlyAccessTokens: tokens - 1,
      vipExpiresAt: expiresAt,
    });
    await onUserUpdate();
    setSaving(false);
    setShowConfirm(false);
    toast.success("⚡ Early Access activated! You can now book 30 minutes early.");
  };

  const formatExpiry = () => {
    if (!vipExpiresAt) return "";
    return vipExpiresAt.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isVipActive ? "text-amber-500" : tokens > 0 ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600"}`} />
          <div>
            <span className={`text-sm font-medium ${isVipActive || tokens > 0 ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
              30-Min Early Access
            </span>
            {isVipActive ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-none mt-0.5 font-semibold">
                ⚡ Active — expires {formatExpiry()}
              </p>
            ) : tokens > 0 ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-none mt-0.5 font-semibold">
                {tokens} token{tokens !== 1 ? "s" : ""} available
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                🔒 No tokens available
              </p>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          disabled={!canActivate || saving}
          onClick={() => setShowConfirm(true)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
            ${isVipActive ? "bg-amber-500" : canActivate ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-50"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isVipActive ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚡ Activate Early Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will consume <strong>1 token</strong> ({tokens} remaining) and grant you <strong>30-minute early booking access</strong> for the next <strong>24 hours</strong> or until your next successful booking, whichever comes first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={handleActivate}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}