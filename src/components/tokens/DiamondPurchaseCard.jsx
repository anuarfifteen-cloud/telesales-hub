import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Gem, Loader2 } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
import { toast } from "sonner";

const MIN_PRICE = 20;
const COOLDOWN_DAYS = 30;

export default function DiamondPurchaseCard({ user, onUserUpdate }) {
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsersDiamondEconomy"],
    queryFn: () => base44.entities.User.list(),
  });

  const eligibleUsers = allUsers.filter(
    (u) => u.role !== "admin" && (u.earlyAccessTokens ?? 0) <= 900
  );
  const totalOfficeTokens = eligibleUsers.reduce((sum, u) => sum + (u.earlyAccessTokens ?? 0), 0);
  const averageUserTokens = eligibleUsers.length > 0 ? Math.floor(totalOfficeTokens / eligibleUsers.length) : 0;
  const currentDiamondPrice = Math.max(MIN_PRICE, averageUserTokens);

  const tokens = user?.earlyAccessTokens ?? 0;
  const diamonds = user?.diamonds ?? 0;

  const lastPurchase = user?.last_diamond_purchase_date ? new Date(user.last_diamond_purchase_date) : null;
  const cooldownEnd = lastPurchase ? new Date(lastPurchase.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;
  const onCooldown = cooldownEnd && cooldownEnd.getTime() > Date.now();
  const canAfford = tokens >= currentDiamondPrice;

  const handleBuy = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      earlyAccessTokens: tokens - currentDiamondPrice,
      diamonds: diamonds + 1,
      last_diamond_purchase_date: new Date().toISOString(),
    });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      amount: -currentDiamondPrice,
      source: "Diamond Purchase",
      timestamp: new Date().toISOString(),
    });
    await onUserUpdate();
    setSaving(false);
    toast.success("💎 Diamond purchased!");
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-foreground">Emergency Diamond Buy</span>
        </div>
        <span className="text-xs font-semibold text-indigo-500">Your Diamonds: {diamonds}</span>
      </div>

      <button
        onClick={handleBuy}
        disabled={saving || onCooldown || !canAfford}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-sm font-bold transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Buy 1 Diamond — ${currentDiamondPrice} Tokens`}
      </button>

      {onCooldown && (
        <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-semibold">
          Available in: {formatCountdown(cooldownEnd)}
        </p>
      )}
      {!onCooldown && !canAfford && (
        <p className="text-xs text-center text-slate-400">Not enough tokens to buy a diamond.</p>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Office Economy: {totalOfficeTokens} total tokens hoarded (Avg: {averageUserTokens}). Diamond price scales with the office average. Minimum price is always 20 Tokens.
      </p>
    </div>
  );
}