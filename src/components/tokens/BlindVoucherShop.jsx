import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function BlindVoucherShop({ user, onUserUpdate }) {
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(false);

  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= 2;

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;
    setPurchasing(true);
    await base44.auth.updateMe({ earlyAccessTokens: tokens - 2 });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      amount: -2,
      source: "Blind Voucher Purchase",
      timestamp: new Date().toISOString(),
    });
    await onUserUpdate();
    setSuccess(true);
    setPurchasing(false);
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎟️</span>
            <h3 className="font-black text-base text-foreground">Blind Voucher</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Spend 2 tokens for a mystery break slot voucher. Reveal your slot on the day!
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
          2 tokens
        </span>
      </div>

      {success ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
          <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
            🎉 You got a Blind Voucher! Check with admin to reveal your slot.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            onClick={handlePurchase}
            disabled={!canAfford || purchasing}
            className="w-full font-black bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Purchase"}
          </Button>
          {!canAfford && (
            <p className="text-xs text-red-500 font-semibold text-center">Not enough tokens</p>
          )}
        </div>
      )}
    </div>
  );
}