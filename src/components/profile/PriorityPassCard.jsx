import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gem } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
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

export default function PriorityPassCard({ user, onUserUpdate }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const diamonds = user?.diamonds ?? 0;
  const activeExpiry = user?.active_pass_expiry ? new Date(user.active_pass_expiry) : null;
  const isActive = activeExpiry && activeExpiry.getTime() > Date.now();
  const canActivate = !isActive && diamonds > 0;

  const handleActivate = async () => {
    setSaving(true);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await base44.auth.updateMe({ diamonds: diamonds - 1, active_pass_expiry: expiresAt });
    await onUserUpdate();
    setSaving(false);
    setShowConfirm(false);
    toast.success("💎 7-Day Priority Access activated!");
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Gem className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-purple-500" : canActivate ? "text-purple-400" : "text-slate-300 dark:text-slate-600"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-nowrap max-w-full">
            <p className={`text-sm font-medium ${isActive || canActivate ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
              7-DAY PRIORITY ACCESS
            </p>
            <span className="text-[10px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse flex-shrink-0">
              New
            </span>
          </div>

          {isActive ? (
            <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-none mt-1 font-semibold">
              💎 Active for: {formatCountdown(activeExpiry)}
            </p>
          ) : (
            <p className={`text-[10px] leading-none mt-1 font-semibold ${canActivate ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`}>
              {diamonds > 0 ? "1 diamond — unlock 6:00 PM early access." : "Requires 1 diamond to activate."}
            </p>
          )}
        </div>
      </div>

      <button
        disabled={!canActivate || saving}
        onClick={() => setShowConfirm(true)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
          ${isActive ? "bg-purple-500 cursor-not-allowed" : canActivate ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-40"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
      </button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>💎 Activate 7-Day Priority Access?</AlertDialogTitle>
            <AlertDialogDescription>
              Consume 1 Diamond to unlock 6:00 PM Early Access for the next 7 days?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={handleActivate} className="bg-purple-500 hover:bg-purple-600 text-white">
              {saving ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}