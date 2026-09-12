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
        lastVaultActionDate: currentMonth,
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
    const growth = Math.max(1, Math.floor(vault * 0.025));
    const grown = vault + growth;
    setBusy(true);
    try {
      await persist({
        tapVaultBalance: grown,
        lastVaultActionDate: currentMonth,
      });
      toast.success(`📈 Re-investment successful! Earned +${growth} tokens in compound growth.`);
    } catch (e) {
      toast.error("Re-investment failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const estGrowth = Math.max(1, Math.floor(vault * 0.025));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 shadow-lg p-5 text-white">
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
        <img
          src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png"
          alt="token"
          className="w-12 h-12 object-contain flex-shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/70 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Vault Balance
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
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 py-2.5 text-xs font-black uppercase tracking-widest text-amber-200 transition hover:from-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          💸 Withdraw 10%
        </button>
        <button
          onClick={reinvest}
          disabled={locked || busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-green-500/10 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:from-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          📈 Re-Invest +2.5%
        </button>
      </div>

      {/* Lock label */}
      {locked && (
        <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/70">
          🔒 Action Claimed for This Month
        </p>
      )}
      </div>

      {/* ── Breakdown & Transparency card ── */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 shadow-lg p-4 text-white">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3 flex items-center gap-1.5">
          ℹ️ Vault Breakdown & Transparency
        </h4>

        {/* 2-column micro-stat row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-[11px] font-black text-emerald-300">🔒 80% of Tax Saved</p>
            <p className="text-[10px] text-emerald-200/70 leading-tight mt-0.5">80% of your tax bill goes here</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-[11px] font-black text-amber-300">🏛️ 20% of Tax to Treasury</p>
            <p className="text-[10px] text-amber-200/70 leading-tight mt-0.5">20% of your tax bill goes here</p>
          </div>
        </div>

        {/* Bullet points */}
        <ul className="space-y-1.5 mb-3">
          <li className="flex gap-1.5 text-[11px] text-slate-300 leading-snug">
            <span className="text-emerald-400 flex-shrink-0">•</span>
            <span><span className="font-bold text-emerald-300">Tax Protection:</span> 80% of your monthly progressive tax is automatically saved here instead of lost.</span>
          </li>
          <li className="flex gap-1.5 text-[11px] text-slate-300 leading-snug">
            <span className="text-amber-400 flex-shrink-0">•</span>
            <span><span className="font-bold text-amber-300">Treasury Reserve:</span> 20% is allocated to the Hub Treasury Stabilization Reserve to protect overall token value.</span>
          </li>
          <li className="flex gap-1.5 text-[11px] text-slate-300 leading-snug">
            <span className="text-sky-400 flex-shrink-0">•</span>
            <span><span className="font-bold text-sky-300">Monthly Choice:</span> On the 1st of every month, withdraw 10% into your active spending wallet OR let it sit to compound at +2.5% growth.</span>
          </li>
        </ul>

        {/* Tax bracket legend */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 mb-3">
          <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-200 mb-2">
            📊 Monthly Wealth Tax Brackets <span className="font-normal text-slate-400 normal-case">(Applies on 1st of Month)</span>
          </h5>
          <ul className="space-y-1">
            <li className="flex items-center justify-between text-[11px] text-slate-300">
              <span>0 – 100 Tokens</span>
              <span className="font-bold text-emerald-400">0% Tax (Completely Tax-Free)</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-700/60 pt-1">
              <span>101 – 500 Tokens</span>
              <span className="font-bold text-yellow-400">10% Tax</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-700/60 pt-1">
              <span>501 – 5,000 Tokens</span>
              <span className="font-bold text-orange-400">50% Tax</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-700/60 pt-1">
              <span>5,001+ Tokens</span>
              <span className="font-bold text-rose-400">85% Tax</span>
            </li>
          </ul>
        </div>

        {/* Clarifying note */}
        <p className="text-[10px] text-amber-200/80 leading-snug mb-3">
          💡 <span className="font-semibold">Note:</span> Tax applies ONLY to tokens within each bracket. The 80% vault / 20% treasury split is calculated from your total tax bill, NOT your total wallet balance!
        </p>

        {/* Estimated next month earnings */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold text-emerald-200">
            Est. Growth Next Month: <span className="font-black text-emerald-300">+{estGrowth} tokens</span> if re-invested.
          </p>
        </div>
      </div>
    </div>
  );
}