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

  return null;


























































}