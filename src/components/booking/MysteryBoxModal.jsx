import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Copy, Check } from "lucide-react";

export default function TokenVoucher({ user, onUserUpdate }) {
  const [amount, setAmount] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTokens = user?.earlyAccessTokens ?? 0;

  // ── 1. GENERATE VOUCHER CODE ──
  const handleCreateVoucher = async () => {
    const tokenNum = parseInt(amount, 10);
    if (isNaN(tokenNum) || tokenNum <= 0) {
      return toast.error("Please enter a valid number of tokens.");
    }
    if (tokenNum > currentTokens) {
      return toast.error("Insufficient tokens in your balance!");
    }

    setLoading(true);
    // Generate a short randomized code string
    const uniqueCode = `VCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      // Deduct tokens from donator
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens - tokenNum });
      
      // Store the code string natively inside the source column parameter
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        amount: -tokenNum,
        source: `VOUCHER_ACTIVE:${uniqueCode}`,
        timestamp: new Date().toISOString(),
      });

      setGeneratedCode(uniqueCode);
      setAmount("");
      await onUserUpdate();
      toast.success("Voucher code generated successfully! 🎉");
    } catch (e) {
      toast.error("Failed to create voucher.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2. CLAIM VOUCHER CODE ──
  const handleClaimVoucher = async () => {
    if (!claimCode.trim()) return toast.error("Please enter a code.");
    setLoading(true);

    const formattedCode = claimCode.trim().toUpperCase();

    try {
      // Look up transactions searching for matching code parameters inside source text
      const transactions = await base44.entities.TokenTransaction.list();
      const voucherTx = transactions.find(t => t.source === `VOUCHER_ACTIVE:${formattedCode}`);

      if (!voucherTx) {
        setLoading(false);
        return toast.error("Invalid or already claimed voucher code.");
      }

      // Extract original token allotment back out of absolute database value
      const tokenRewardValue = Math.abs(voucherTx.amount);

      // Add tokens to the claiming user profile balance configuration
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens + tokenRewardValue });

      // Mark the original transaction voucher code text string flag as CLAIMED 
      await base44.entities.TokenTransaction.update(voucherTx.id, {
        source: `VOUCHER_CLAIMED:${formattedCode}_BY_${user.email}`
      });

      // Log secondary transaction recording local claim action history logs
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        amount: tokenRewardValue,
        source: `Claimed Voucher: ${formattedCode}`,
        timestamp: new Date().toISOString(),
      });

      setClaimCode("");
      await onUserUpdate();
      toast.success(`Success! Added +${tokenRewardValue} tokens to your balance. 🪙`);
    } catch (e) {
      toast.error("Error processing voucher claim.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
      <div className="flex items-center gap-2 border-b pb-2">
        <Gift className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-sm">Token Voucher Transfer System</h3>
      </div>

      {/* Issuing Panel */}
      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
        <p className="text-xs font-bold text-muted-foreground uppercase">Create Voucher Code</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Tokens amount..."
            className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none bg-background"
          />
          <Button size="sm" onClick={handleCreateVoucher} disabled={loading} className="text-xs h-8">
            Issue
          </Button>
        </div>

        {generatedCode && (
          <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center justify-between">
            <span className="font-mono text-xs font-bold select-all">{generatedCode}</span>
            <button onClick={copyToClipboard} className="hover:text-emerald-700">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Claiming Panel */}
      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
        <p className="text-xs font-bold text-muted-foreground uppercase">Redeem/Claim Voucher Code</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Paste voucher code here..."
            className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none bg-background font-mono uppercase"
          />
          <Button size="sm" variant="secondary" onClick={handleClaimVoucher} disabled={loading} className="text-xs h-8">
            Redeem
          </Button>
        </div>
      </div>
    </div>
  );
}