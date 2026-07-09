import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
    <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">7-Day Priority</span>
          <span className="text-[9px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0">
            New
          </span>
        </div>
        {isActive ? (
          <p className="text-xs text-purple-400 font-semibold leading-snug">
            Active for {formatCountdown(activeExpiry)}
          </p>
        ) : (
          <p className="text-xs text-slate-400 leading-snug">
            {diamonds > 0 ? "1 💎 — unlock 6:00 PM early access." : "Requires 1 diamond to activate."}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{isActive ? "Enabled" : "Activate"}</span>
        <button
          disabled={!canActivate || saving}
          onClick={() => setShowConfirm(true)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
            ${isActive ? "bg-purple-500 cursor-not-allowed" : canActivate ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-800 cursor-not-allowed opacity-40"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

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