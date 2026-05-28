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

export default function EarlyAccessToggle({ user, onUserUpdate, totalBookingCount = 0 }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const tokens = user?.earlyAccessTokens ?? 0;
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const isVipActive = vipExpiresAt && vipExpiresAt.getTime() > Date.now();
  const canActivate = tokens > 0 && !isVipActive;

  const milestone15Done = totalBookingCount >= 15;
  const milestone30Done = totalBookingCount >= 30;

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
      {/* ── Milestones ── */}
      <div className="space-y-2">
        {/* Milestone 1 — 15 bookings */}
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${milestone15Done ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"}`}>
          <span className={`text-lg ${milestone15Done ? "" : "grayscale opacity-40"}`}>👑</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${milestone15Done ? "text-emerald-800 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
              15 Bookings — Earn 3 Tokens
            </p>
            {milestone15Done ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Milestone reached</p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{totalBookingCount}/15 bookings</p>
            )}
          </div>
          {milestone15Done ? (
            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">DONE</span>
          ) : (
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">LOCKED</span>
          )}
        </div>

        {/* Milestone 2 — 30 bookings */}
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${milestone30Done ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"}`}>
          <span className={`text-lg ${milestone30Done ? "" : "grayscale opacity-40"}`}>🌟</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${milestone30Done ? "text-amber-800 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
              30 Bookings — Earn 5 Tokens
            </p>
            {milestone30Done ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">✓ Milestone reached</p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{totalBookingCount}/30 bookings</p>
            )}
          </div>
          {milestone30Done ? (
            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">DONE</span>
          ) : (
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">LOCKED</span>
          )}
        </div>
      </div>

      {/* ── Spend Tokens ── */}
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 flex-shrink-0 ${isVipActive ? "text-amber-500" : tokens > 0 ? "text-blue-500" : "text-slate-300 dark:text-slate-600"}`} />
          <div>
            <p className={`text-sm font-medium ${isVipActive || tokens > 0 ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
              Spend a Token
            </p>
            {isVipActive ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-none mt-0.5 font-semibold">
                ⚡ Active — expires {formatExpiry()}
              </p>
            ) : tokens > 0 ? (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-none mt-0.5 font-semibold">
                {tokens} token{tokens !== 1 ? "s" : ""} available — book 30 min early for 24h
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                No tokens available
              </p>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          disabled={!canActivate || saving}
          onClick={() => setShowConfirm(true)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
            ${isVipActive ? "bg-amber-500" : canActivate ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-40"}`}
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