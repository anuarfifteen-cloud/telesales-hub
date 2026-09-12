import { useState } from "react";
import { Landmark, Lock, TrendingUp, Banknote, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function TapVaultCard({ user, onUserUpdate }) {
  const vault = Number(user?.tapVaultBalance) || 0;
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const currentMonth = getCurrentMonth();
  const claimed = user?.lastVaultActionDate === currentMonth;
  const locked = claimed || vault <= 0;
  const [busy, setBusy] = useState(false);

  const persist = async (patch) => {
    await base44.auth.updateMe(patch);
    await onUserUpdate?.();
  };

  const withdraw = async () => {
    if (busy || locked) return;
    const allowance = Math.floor(vault * 0.10);
    if (allowance <= 0) {
      toast.error("Not enough vault balance to withdraw 10%.");
      return;
    }
    setBusy(true);
    try {
      await persist({
        tapVaultBalance: vault - allowance,
        earlyAccessTokens: tokens + allowance,
        lastVaultActionDate: currentMonth
      });
      toast.success(`💸 Withdrew ${allowance} tokens from your Vault into your wallet.`);
    } catch (e) {
      toast.error("Withdrawal failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const reinvest = async () => {
    if (busy || locked) return;
    const grown = Math.floor(vault * 1.025);
    setBusy(true);
    try {
      await persist({
        tapVaultBalance: grown,
        lastVaultActionDate: currentMonth
      });
      toast.success(`📈 Re-invested! Your Vault grew by +2.5% to ${grown} tokens.`);
    } catch (e) {
      toast.error("Re-investment failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 shadow-lg p-5 text-white hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
          <Landmark className="h-5 w-5 text-amber-400" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
          🏛️ TAP Savings & Investment Vault
        </h3>
      </div>

      {/* Balance display */}
      <div className="flex items-center gap-3 rounded-xl bg-black/40 border border-amber-400/20 px-4 py-3 mb-3">
        <Lock className="h-6 w-6 text-amber-400 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/70">
            Vault Balance
          </span>
          <span className="text-3xl font-black tabular-nums text-amber-300 leading-none">
            {vault}
          </span>
          <span className="text-[11px] text-amber-200/60">🪙 tokens locked away</span>
        </div>
      </div>

      {/* Status text */}
      <p className="text-[11px] text-slate-300/80 mb-4 text-center">
        Next monthly action available on the 1st of next month.
      </p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={withdraw}
          disabled={locked || busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 py-2.5 text-xs font-black uppercase tracking-widest text-amber-200 transition hover:from-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
          
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          💸 Withdraw 10%
        </button>
        <button
          onClick={reinvest}
          disabled={locked || busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-green-500/10 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:from-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
          
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          📈 Re-Invest +2.5%
        </button>
      </div>

      {/* Lock label */}
      {locked &&
      <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/70">
          🔒 Action Claimed for This Month
        </p>
      }
    </div>);

}