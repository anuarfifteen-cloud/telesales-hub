import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Gem, Loader2, Info } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

const MIN_PRICE = 20;
const COOLDOWN_DAYS = 30;

export default function DiamondBalanceCard({ user, onUserUpdate }) {
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
    (u) => u.role !== "admin" && (u.earlyAccessTokens ?? 0) <= 300
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
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            Diamonds
            <Popover>
              <PopoverTrigger className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Price info">
                <Info className="w-3 h-3" />
              </PopoverTrigger>
              <PopoverContent className="w-56 text-xs p-3 space-y-1">
                <p className="font-semibold text-foreground">Dynamic Diamond Price</p>
                <p className="text-muted-foreground">Office Total: {totalOfficeTokens}</p>
                <p className="text-muted-foreground">Avg: {averageUserTokens}</p>
                <p className="text-muted-foreground">Min: {MIN_PRICE} Tokens</p>
              </PopoverContent>
            </Popover>
          </span>
          <span className="text-3xl font-black text-foreground">{diamonds}</span>
          <span className="text-xs text-muted-foreground">diamonds owned</span>
        </div>
        <Gem className="w-14 h-14 text-indigo-400 flex-shrink-0" strokeWidth={1.5} />
      </div>

      <button
        onClick={handleBuy}
        disabled={saving || onCooldown || !canAfford}
        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-xs font-bold transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Buy 1 💎 — ${currentDiamondPrice} Tokens`}
      </button>

      {onCooldown ? (
        <p className="text-[10px] text-center text-amber-500 font-semibold">
          Available in: {formatCountdown(cooldownEnd)}
        </p>
      ) : !canAfford ? (
        <p className="text-[10px] text-center text-muted-foreground">Not enough tokens</p>
      ) : null}
    </div>
  );
}