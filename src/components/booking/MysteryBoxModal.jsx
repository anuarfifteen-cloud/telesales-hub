import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export default function TokenVoucher({ user, onUserUpdate }) {
  const [amount, setAmount] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voucherStatus, setVoucherStatus] = useState(null);

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

  // ── 2. CLAIM VOUCHER CODE (WITH SPECIFIC TOKEN VALUE) ──
  const handleClaimVoucher = async () => {
    if (!claimCode.trim()) return toast.error("Please enter a code.");
    setLoading(true);
    setVoucherStatus(null);

    const formattedCode = claimCode.trim().toUpperCase();

    try {
      // Fetch all transactions to scan code statuses dynamically
      const transactions = await base44.entities.TokenTransaction.list();
      
      const activeTx = transactions.find(t => t.source === `VOUCHER_ACTIVE:${formattedCode}`);
      const claimedTx = transactions.find(t => t.source.startsWith(`VOUCHER_CLAIMED:${formattedCode}`));

      // 🛑 Condition A: Code does not exist in logs
      if (!activeTx && !claimedTx) {
        setVoucherStatus({ text: "Code Does Not Exist ❌", color: "text-red-600 dark:text-red-400" });
        setLoading(false);
        return toast.error("Invalid voucher code.");
      }

      // 🛑 Condition B: Code is found but already claimed
      if (claimedTx) {
        setVoucherStatus({ text: "Already Claimed 🚫", color: "text-amber-600 dark:text-amber-400" });
        setLoading(false);
        return toast.error("This voucher has already been claimed.");
      }

      // 🟢 Condition C: Code is valid and active! Proceed to deposit tokens
      const tokenRewardValue = Math.abs(activeTx.amount);

      // Add tokens to claiming agent balance profile configuration
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens + tokenRewardValue });

      // Mark the original transaction voucher code text string flag as CLAIMED 
      await base44.entities.TokenTransaction.update(activeTx.id, {
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

      // ── DYNAMIC UPDATE: Specifically prints out how many tokens were added ──
      setVoucherStatus({ 
        text: `Success! +${tokenRewardValue} ${tokenRewardValue === 1 ? 'Token' : 'Tokens'} Added 🪙`, 
        color: "text-emerald-600 dark:text-emerald-400" 
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
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
      <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">🎁 TOKEN VOUCHER TRANSFER</p>

      {/* Issuing Panel */}
      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Create Voucher Code</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Tokens amount..."
            className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background"
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
{/* Claiming Panel */}
      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Redeem Voucher Code</p>
        <div className="flex gap-2 relative items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={claimCode}
              onChange={(e) => {
                setClaimCode(e.target.value);
                setVoucherStatus(null);
              }}
              placeholder="Enter voucher code..."
              className="w-full text-xs border rounded-lg pl-2.5 pr-14 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background font-mono uppercase"
            />
            {/* Native Quick Paste Icon Shortcut */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setClaimCode(text);
                    setVoucherStatus(null);
                    toast.success("Code pasted from clipboard! 📋");
                  }
                } catch (err) {
                  toast.error("Clipboard access denied. Please paste manually.");
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 px-1.5 py-0.5 rounded text-muted-foreground transition-colors"
            >
              Paste
            </button>
          </div>
          
          <Button size="sm" variant="secondary" onClick={handleClaimVoucher} disabled={loading} className="text-xs h-8 flex-shrink-0">
            Redeem
          </Button>
        </div>

        {/* Dynamic Auto-Status UI Alert */}
        {voucherStatus && (
          <div className="pt-1 flex items-center justify-end text-[11px]">
            <span className={`font-bold tracking-wide ${voucherStatus.color}`}>
              {voucherStatus.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}