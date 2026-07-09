import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Gem, Loader2, Info } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Gem className="w-3.5 h-3.5 text-indigo-400" /> Diamonds
          </span>
          <Popover>
            <PopoverTrigger className="text-slate-500 hover:text-slate-300 transition-colors" aria-label="Price info">
              <Info className="w-3.5 h-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-56 text-xs p-3 space-y-1">
              <p className="font-semibold text-foreground">Dynamic Diamond Price</p>
              <p className="text-muted-foreground">Office Total: {totalOfficeTokens}</p>
              <p className="text-muted-foreground">Avg: {averageUserTokens}</p>
              <p className="text-muted-foreground">Min: {MIN_PRICE} Tokens</p>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-3xl font-black text-white leading-none">{diamonds}</p>
      </div>

      <div className="mt-3">
        <button
          onClick={handleBuy}
          disabled={saving || onCooldown || !canAfford}
          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Buy 1 💎 — ${currentDiamondPrice} Tokens`}
        </button>

        {onCooldown ? (
          <p className="text-[10px] text-center text-amber-400 font-semibold mt-1.5">
            Available in: {formatCountdown(cooldownEnd)}
          </p>
        ) : !canAfford ? (
          <p className="text-[10px] text-center text-slate-500 mt-1.5">Not enough tokens</p>
        ) : null}
      </div>
    </div>
  );
}