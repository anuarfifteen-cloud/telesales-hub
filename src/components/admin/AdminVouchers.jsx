import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignInputs, setAssignInputs] = useState({});
  const [saving, setSaving] = useState({});

  const loadVouchers = async () => {
    const data = await base44.entities.Voucher.list("-created_at");
    setVouchers(data);
    setLoading(false);
  };

  useEffect(() => { loadVouchers(); }, []);

  const handleAssign = async (voucher) => {
    const slot = assignInputs[voucher.id]?.trim();
    if (!slot) return;
    setSaving((s) => ({ ...s, [voucher.id]: true }));
    await base44.entities.Voucher.update(voucher.id, { assigned_slot: slot });
    toast.success(`Slot assigned to ${voucher.user_name || voucher.code}`);
    await loadVouchers();
    setAssignInputs((s) => ({ ...s, [voucher.id]: "" }));
    setSaving((s) => ({ ...s, [voucher.id]: false }));
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (vouchers.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No vouchers yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">All Vouchers</p>
      {vouchers.map((v) => (
        <div key={v.id} className="bg-card rounded-xl border border-border p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">{v.user_name || "Unknown"}</span>
              <span className="font-mono text-sm font-black text-foreground tracking-wider">{v.code}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              v.status === "redeemed"
                ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
            }`}>
              {v.status === "redeemed" ? "Redeemed" : "Active"}
            </span>
          </div>

          {v.assigned_slot && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-1.5">
              🎯 Assigned: {v.assigned_slot}
            </div>
          )}

          {v.status === "redeemed" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={assignInputs[v.id] || ""}
                onChange={(e) => setAssignInputs((s) => ({ ...s, [v.id]: e.target.value }))}
                placeholder={v.assigned_slot ? "Update slot…" : "Assign slot…"}
                className="flex-1 text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                onClick={() => handleAssign(v)}
                disabled={!assignInputs[v.id]?.trim() || saving[v.id]}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving[v.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}