import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";

function generateCode() {
  const chunk = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BV-${chunk()}-${chunk()}`;
}

function randomReward() {
  return Math.floor(Math.random() * 5) + 1; // 1–5
}

export default function BlindVoucherShop({ user, onUserUpdate }) {
  const [purchasing, setPurchasing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { code, reward_tokens }
  const [copied, setCopied] = useState(false);
  const [activeVouchers, setActiveVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= 2;

  const loadActiveVouchers = async () => {
    if (!user?.id) return;
    const vouchers = await base44.entities.Voucher.filter({ user_id: user.id, status: "active" });
    vouchers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setActiveVouchers(vouchers);
    setLoadingVouchers(false);
  };

  useEffect(() => {
    loadActiveVouchers();
  }, [user?.id]);

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;
    setPurchasing(true);
    const code = generateCode();
    const reward = randomReward();

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
      reward_tokens: reward,
      status: "active",
      created_at: new Date().toISOString(),
    });

    setLastResult({ code, reward_tokens: reward });
    await onUserUpdate();
    await loadActiveVouchers();
    setPurchasing(false);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              Spend 2 tokens for a mystery voucher worth 1–5 tokens. Redeem it in your Profile tab!
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
            2 tokens
          </span>
        </div>

        {lastResult ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-3">
            <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300 text-center">
              🎉 Your Blind Voucher is ready!
            </p>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-700 px-4 py-3 gap-3">
              <span className="font-mono font-black text-lg text-foreground tracking-widest">{lastResult.code}</span>
              <button
                onClick={() => handleCopy(lastResult.code)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Redeem this code in your Profile tab to reveal your reward!
            </p>
            <Button onClick={() => setLastResult(null)} variant="outline" className="w-full text-xs">
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

      {/* My Active Vouchers */}
      {!loadingVouchers && activeVouchers.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Active Vouchers</p>
          {activeVouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 gap-2">
              <span className="font-mono font-bold text-sm text-foreground tracking-wider">{v.code}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(v.code)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}