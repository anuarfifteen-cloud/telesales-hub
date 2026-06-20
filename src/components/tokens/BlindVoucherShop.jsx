import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";

function generateCode() {
  const chunk = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BV-${chunk()}-${chunk()}`;
}

export default function BlindVoucherShop({ user, onUserUpdate }) {
  const [purchasing, setPurchasing] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= 2;

  const loadMyVouchers = async () => {
    if (!user?.id) return;
    const vouchers = await base44.entities.Voucher.filter({ user_id: user.id });
    vouchers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setMyVouchers(vouchers);
    setLoadingVouchers(false);
  };

  useEffect(() => {
    loadMyVouchers();
  }, [user?.id]);

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;
    setPurchasing(true);
    const code = generateCode();
    await base44.auth.updateMe({ earlyAccessTokens: tokens - 2 });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      amount: -2,
      source: "Blind Voucher Purchase",
      timestamp: new Date().toISOString(),
    });
    await base44.entities.Voucher.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      code,
      status: "active",
      created_at: new Date().toISOString(),
    });
    setGeneratedCode(code);
    await onUserUpdate();
    await loadMyVouchers();
    setPurchasing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const redeemedVouchers = myVouchers.filter((v) => v.status === "redeemed");
  const activeVouchers = myVouchers.filter((v) => v.status === "active");

  return (
    <div className="flex flex-col gap-3">
      {/* Purchase Card */}
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

        {generatedCode ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-3">
            <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300 text-center">
              🎉 Your Blind Voucher is ready!
            </p>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-700 px-4 py-3 gap-3">
              <span className="font-mono font-black text-lg text-foreground tracking-widest">{generatedCode}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Show this code to admin or redeem it below to claim your mystery slot.
            </p>
            <Button
              onClick={() => setGeneratedCode(null)}
              variant="outline"
              className="w-full text-xs"
            >
              Buy Another
            </Button>
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

      {/* My Vouchers — active (unredeemed) */}
      {!loadingVouchers && activeVouchers.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Active Vouchers</p>
          {activeVouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <span className="font-mono font-bold text-sm text-foreground tracking-wider">{v.code}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">Active</span>
            </div>
          ))}
        </div>
      )}

      {/* My Mystery Slots — redeemed vouchers with assigned slots */}
      {!loadingVouchers && redeemedVouchers.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Mystery Slots</p>
          {redeemedVouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-border rounded-xl px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-muted-foreground">{v.code}</span>
                {v.assigned_slot ? (
                  <span className="font-bold text-sm text-foreground">🎯 {v.assigned_slot}</span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Awaiting admin assignment…</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Redeemed</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}