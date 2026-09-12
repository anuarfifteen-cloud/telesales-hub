import { useState } from "react";
import { Landmark, Lock, TrendingUp, Banknote, Loader2, Plus, X } from "lucide-react";
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
    const growth = Math.max(1, Math.floor(vault * 0.10));
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

  // ── Manual Deposit ────────────────────────────────────────────────────
  const MAX_DEPOSIT = 1000;
  const today = new Date();
  const depositFrozen = [28, 29, 30, 31].includes(today.getDate());
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const deposit = async () => {
    if (busy) return;
    if (depositFrozen) {
      toast.error("🚫 Deposits are frozen on the 28th–31st each month (tax season). Reopens on the 1st.");
      return;
    }
    const amount = Math.floor(Number(depositAmount));
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter a whole number of tokens (1 or more).");
      return;
    }
    if (amount > tokens) {
      toast.error("Not enough tokens in your wallet for that deposit.");
      return;
    }
    if (amount > MAX_DEPOSIT) {
      toast.error(`Maximum deposit is ${MAX_DEPOSIT} tokens per transaction.`);
      return;
    }
    setBusy(true);
    try {
      await persist({
        earlyAccessTokens: tokens - amount,
        tapVaultBalance: vault + amount,
      });
      setDepositAmount("");
      setShowDeposit(false);
      toast.success(`🔒 Successfully vaulted ${amount} tokens! They will now earn +10% monthly interest.`);
    } catch (e) {
      toast.error("Deposit failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const estGrowth = Math.max(1, Math.floor(vault * 0.10));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent ring-1 ring-ring/30">
          <Landmark className="h-5 w-5 text-accent-foreground" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-primary">
           TAP Savings & Investment Vault
        </h3>
      </div>

      {/* Balance display */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 border border-border px-4 py-3 mb-3">
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Vault Balance
            </span>
            <span className="text-3xl font-black tabular-nums text-primary leading-none">
              {vault}
            </span>
            <span className="text-[11px] text-muted-foreground"> tokens locked away</span>
          </div>
        </div>
        <img
          src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png"
          alt="token"
          className="w-14 h-14 object-contain flex-shrink-0"
        />
      </div>

      {/* Status text */}
      <p className="text-[11px] text-muted-foreground mb-4 text-center">
        Next monthly action available on the 1st of next month.
      </p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={withdraw}
          disabled={locked || busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-secondary-foreground py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          💸 Withdraw 10%
        </button>
        <button
          onClick={reinvest}
          disabled={locked || busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          📈 Re-Invest +10%
        </button>
      </div>

      {/* Lock label */}
      {locked && (
        <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-primary/70">
          🔒 Action Claimed for This Month
        </p>
      )}

      {/* ── Manual Deposit to Vault ── */}
      <div className="mt-3 border-t border-border pt-3">
        {showDeposit ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={Math.min(MAX_DEPOSIT, tokens)}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`Tokens to vault (max ${Math.min(MAX_DEPOSIT, tokens)})`}
                className="flex-1 rounded-xl border border-border bg-input text-foreground px-3 py-2.5 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={deposit}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-primary/90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Vault
              </button>
              <button
                onClick={() => { setShowDeposit(false); setDepositAmount(""); }}
                className="flex items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground px-3 py-2.5 transition hover:bg-secondary/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              🔒 Deposited tokens add directly to your Vault balance for +10% monthly yield. Depositing does not consume your monthly action.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowDeposit(true)}
            disabled={depositFrozen || busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            ➕ Deposit to Vault
          </button>
        )}
        {depositFrozen && !showDeposit && (
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            🚫 Deposits frozen (28th–31st) — reopens on the 1st
          </p>
        )}
        {!depositFrozen && !showDeposit && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground leading-snug">
            🔒 Deposited tokens add directly to your Vault balance for +10% monthly yield. Depositing does not consume your monthly action.
          </p>
        )}
      </div>
      </div>

      {/* ── Breakdown & Transparency card ── */}
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-3 flex items-center gap-1.5">
          ℹ️ Vault Breakdown & Transparency
        </h4>

        {/* 2-column micro-stat row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg border border-border bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">🔒 80% of Tax goes to Savings</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">80% of your tax bill goes here</p>
          </div>
          <div className="rounded-lg border border-border bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">🏛️ 20% of Tax goes to Treasury</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">20% of your tax bill goes here</p>
          </div>
        </div>

        {/* Bullet points */}
        <ul className="space-y-1.5 mb-3">
          <li className="flex gap-1.5 text-[11px] text-muted-foreground leading-snug">
            <span className="text-emerald-500 flex-shrink-0">•</span>
            <span><span className="font-bold text-foreground">Tax Protection:</span> 80% of your monthly progressive tax is automatically saved here instead of lost.</span>
          </li>
          <li className="flex gap-1.5 text-[11px] text-muted-foreground leading-snug">
            <span className="text-amber-500 flex-shrink-0">•</span>
            <span><span className="font-bold text-foreground">Treasury Reserve:</span> 20% is allocated to the Hub Treasury Stabilization Reserve to protect overall token value.</span>
          </li>
          <li className="flex gap-1.5 text-[11px] text-muted-foreground leading-snug">
            <span className="text-sky-500 flex-shrink-0">•</span>
            <span><span className="font-bold text-foreground">Monthly Choice:</span> On the 1st of every month, withdraw 10% into your active spending wallet OR let it sit to compound at +10% growth.</span>
          </li>
        </ul>

        {/* Tax bracket legend */}
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 mb-3">
          <h5 className="text-[11px] font-black uppercase tracking-wide text-foreground mb-2">
            📊 Monthly Wealth Tax Brackets <span className="font-normal text-muted-foreground normal-case">(Applies on 1st of Month)</span>
          </h5>
          <ul className="space-y-1">
            <li className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>0 – 100 Tokens</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0% Tax (Completely Tax-Free)</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-1">
              <span>101 – 500 Tokens</span>
              <span className="font-bold text-yellow-600 dark:text-yellow-400">10% Tax</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-1">
              <span>501 – 5,000 Tokens</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">50% Tax</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-1">
              <span>5,001+ Tokens</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">85% Tax</span>
            </li>
          </ul>
        </div>

        {/* Clarifying note */}
        <p className="text-[10px] text-muted-foreground leading-snug mb-3">
          💡 <span className="font-semibold text-foreground">Note:</span> Tax applies ONLY to tokens within each bracket. The 80% vault / 20% treasury split is calculated from your total tax bill, NOT your total wallet balance!
        </p>

        {/* Estimated next month earnings */}
        <div className="rounded-lg border border-border bg-emerald-500/5 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Est. Growth Next Month: <span className="font-black text-emerald-600 dark:text-emerald-400">+{estGrowth} tokens</span> if re-invested.
          </p>
        </div>
      </div>
    </div>
  );
}