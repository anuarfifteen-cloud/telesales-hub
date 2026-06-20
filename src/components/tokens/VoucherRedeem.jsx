import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function VoucherRedeem({ user }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

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

    await base44.entities.Voucher.update(voucher.id, { status: "redeemed" });
    setSuccess(true);
    setCode("");
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Redeem a Voucher</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); setSuccess(false); }}
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
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          🎉 Code Redeemed! Admin will assign your slot shortly.
        </p>
      )}
    </div>
  );
}