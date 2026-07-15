import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
import { toast } from "sonner";

const COOLDOWN_DAYS = 30;
const DIAMOND_IMAGE_URL = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b52888c95_Gemini_Generated_Image_3fwfra3fwfra3fwf-removebg-preview.png";

export default function DiamondBalanceCard({ user, onUserUpdate }) {
  const [saving, setSaving] = useState(false);
  const [diamondPrice, setDiamondPrice] = useState(25);
  const [storeOpen, setStoreOpen] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so the cooldown countdown stays live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      const s = rows[0];
      if (!s) return;
      if (s.diamond_price != null) setDiamondPrice(s.diamond_price);
      const enabled = s.diamond_store_enabled === true;
      const start = s.diamond_store_start_time ? new Date(s.diamond_store_start_time) : null;
      const end = s.diamond_store_end_time ? new Date(s.diamond_store_end_time) : null;
      const now = Date.now();
      const withinWindow = !!(start && end && now >= start.getTime() && now <= end.getTime());
      setStoreOpen(enabled && withinWindow);
    });
  }, []);

  const tokens = user?.earlyAccessTokens ?? 0;
  const diamonds = user?.diamonds ?? 0;

  const lastPurchase = user?.last_diamond_purchase_date ? new Date(user.last_diamond_purchase_date) : null;
  const cooldownEnd = lastPurchase ? new Date(lastPurchase.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;
  const onCooldown = cooldownEnd && cooldownEnd.getTime() > Date.now();
  const canAfford = tokens >= diamondPrice;

  const handleBuy = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      earlyAccessTokens: tokens - diamondPrice,
      diamonds: diamonds + 1,
      last_diamond_purchase_date: new Date().toISOString(),
    });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      amount: -diamondPrice,
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
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Diamond Balance</span>
          <span className="text-3xl font-black text-foreground">{diamonds}</span>
          <span className="text-xs text-muted-foreground">diamonds available</span>
        </div>
        <img src={DIAMOND_IMAGE_URL} alt="diamond" className="w-24 h-24 object-contain" />
      </div>

      {storeOpen && (
        <>
          <button
            onClick={handleBuy}
            disabled={saving || onCooldown || !canAfford}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-xs font-bold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Buy 1 💎 — ${diamondPrice} Tokens`}
          </button>

          {onCooldown ? (
            <p className="text-[10px] text-center text-amber-500 font-semibold">
              Available in: {formatCountdown(cooldownEnd)}
            </p>
          ) : !canAfford ? (
            <p className="text-[10px] text-center text-muted-foreground">Not enough tokens</p>
          ) : null}
        </>
      )}
    </div>
  );
}