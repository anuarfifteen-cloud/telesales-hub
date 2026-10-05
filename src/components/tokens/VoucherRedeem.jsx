import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { rewardForRedemption, voucherRewardFields } from "@/lib/voucherReward";
import { logChipMovement } from "@/lib/chipLog";

export default function VoucherRedeem({ user, onUserUpdate }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const results = await base44.entities.Voucher.filter({ code: code.trim().toUpperCase() });
    const voucher = results[0];

    if (!voucher) {
      setError("Invalid code.");
      setLoading(false);
      return;
    }
    if (voucher.status === "redeemed") {
      setError("Code already used.");
      setLoading(false);
      return;
    }
    if (voucher.user_id !== user.id) {
      setError("This code is not yours.");
      setLoading(false);
      return;
    }

    const freshUser = await base44.auth.me();
    // The reward is rolled from the current allocation at claim time, including
    // for vouchers bought under the previous table.
    const reward = rewardForRedemption(voucher);
    const { type: rewardType, amount: rewardAmount } = reward;
    const redemptionPatch = { status: "redeemed", ...voucherRewardFields(reward) };
    const userName = user.full_name || user.email?.split("@")[0] || "Unknown";

    if (rewardType === "diamond") {
      const currentDiamonds = freshUser?.diamonds ?? 0;
      await Promise.all([
        base44.auth.updateMe({ diamonds: currentDiamonds + 1 }),
        base44.entities.Voucher.update(voucher.id, redemptionPatch),
        base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: userName,
          amount: 0,
          source: `Blind Voucher Redemption — DIAMOND (${voucher.code})`,
          timestamp: new Date().toISOString(),
        }),
      ]);
      setSuccessMsg("💎 JACKPOT! You won a VIP Diamond!");
    } else if (rewardType === "chips") {
      const currentChips = Number(freshUser?.casinoChips) || 0;
      await Promise.all([
        base44.auth.updateMe({ casinoChips: currentChips + rewardAmount }),
        base44.entities.Voucher.update(voucher.id, redemptionPatch),
        logChipMovement({
          user,
          action_type: "win",
          amount: rewardAmount,
          balance_after: currentChips + rewardAmount,
          detail: `Blind Voucher redemption (${voucher.code}) — ${rewardAmount} chips`,
        }),
        base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: userName,
          amount: 0,
          source: `Blind Voucher Redemption — CHIPS (${voucher.code})`,
          timestamp: new Date().toISOString(),
        }),
      ]);
      setSuccessMsg(`🎰 Voucher redeemed! You received ${rewardAmount} casino chip${rewardAmount !== 1 ? "s" : ""}.`);
    } else {
      const currentTokens = freshUser?.earlyAccessTokens ?? 0;
      await Promise.all([
        base44.auth.updateMe({ earlyAccessTokens: currentTokens + rewardAmount }),
        base44.entities.Voucher.update(voucher.id, redemptionPatch),
        base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: userName,
          amount: rewardAmount,
          source: `Blind Voucher Redemption (${voucher.code})`,
          timestamp: new Date().toISOString(),
        }),
      ]);
      setSuccessMsg(`🎉 Voucher redeemed! You received ${rewardAmount} token${rewardAmount !== 1 ? "s" : ""}.`);
    }

    setCode("");
    await onUserUpdate();
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Redeem a Voucher</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); setSuccessMsg(null); }}
          placeholder="BV-XXXX-XXXX"
          className="flex-1 font-mono text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <Button
          onClick={handleRedeem}
          disabled={!code.trim() || loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      {successMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{successMsg}</p>}
    </div>
  );
}