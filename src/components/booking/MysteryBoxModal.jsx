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
    const uniqueCode = `VCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens - tokenNum });
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
    setVoucherStatus(null);

    const formattedCode = claimCode.trim().toUpperCase();

    try {
      const transactions = await base44.entities.TokenTransaction.list();
      const activeTx = transactions.find(t => t.source === `VOUCHER_ACTIVE:${formattedCode}`);
      const claimedTx = transactions.find(t => t.source.startsWith(`VOUCHER_CLAIMED:${formattedCode}`));

      if (!activeTx && !claimedTx) {
        setVoucherStatus({ text: "Code Does Not Exist ❌", color: "text-red-600 dark:text-red-400" });
        setLoading(false);
        return toast.error("Invalid voucher code.");
      }

      if (claimedTx) {
        setVoucherStatus({ text: "Already Claimed 🚫", color: "text-amber-600 dark:text-amber-400" });
        setLoading(false);
        return toast.error("This voucher has already been claimed.");
      }

      const tokenRewardValue = Math.abs(activeTx.amount);
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens + tokenRewardValue });

      await base44.entities.TokenTransaction.update(activeTx.id, {
        source: `VOUCHER_CLAIMED:${formattedCode}_BY_${user.email}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        amount: tokenRewardValue,
        source: `Claimed Voucher: ${formattedCode}`,
        timestamp: new Date().toISOString(),
      });

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
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Redesigned Header: Clean Layout Grid */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border-b border-border flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">🎁 Voucher Transfer</p>
          <p className="text-[10px] text-muted-foreground">Issue or redeem early access credits</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Available to Gift</span>
          <span className="text-base font-black text-slate-800 dark:text-gray-100 tabular-nums">{currentTokens} <span className="text-xs font-normal text-muted-foreground">Tokens</span></span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Issuing Panel */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Create a Gift Voucher</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to generate..."
              className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background"
            />
            <Button size="sm" onClick={handleCreateVoucher} disabled={loading} className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white">
              Generate
            </Button>
          </div>

          {generatedCode && (
            <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center justify-between">
              <span className="font-mono text-xs font-bold select-all tracking-wider">{generatedCode}</span>
              <button onClick={copyToClipboard} className="hover:text-emerald-700 p-1 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-border/60" />

        {/* Claiming Panel */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Redeem Received Code</p>
          <div className="flex gap-2 relative items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={claimCode}
                onChange={(e) => {
                  setClaimCode(e.target.value);
                  setVoucherStatus(null);
                }}
                placeholder="Paste VCH code here..."
                className="w-full text-xs border rounded-lg pl-2.5 pr-14 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background font-mono uppercase tracking-wide"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setClaimCode(text);
                      setVoucherStatus(null);
                      toast.success("Code pasted! 📋");
                    }
                  } catch (err) {
                    toast.error("Please paste code manually.");
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded text-muted-foreground transition-colors"
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
    </div>
  );
}