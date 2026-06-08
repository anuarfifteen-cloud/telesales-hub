import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TokenShopSettings() {
  const [price, setPrice] = useState("");
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      if (rows.length > 0) {
        setSettingsId(rows[0].id);
        setPrice(String(rows[0].vip_pass_price ?? 1));
      } else {
        setPrice("1");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const parsed = parseInt(price, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Price must be a whole number of at least 1.");
      return;
    }
    setSaving(true);
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, { vip_pass_price: parsed });
    } else {
      const created = await base44.entities.AppSettings.create({ vip_pass_price: parsed });
      setSettingsId(created.id);
    }
    setSaving(false);
    toast.success("VIP Pass price successfully updated!");
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🛒 Token Shop Management</h3>
        <p className="text-sm text-slate-500 mt-0.5">Set how many tokens are required to activate the VIP Early Access Pass.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading current price…
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">
              VIP Pass Price (Tokens)
            </label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="pt-5">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Price 💾"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}