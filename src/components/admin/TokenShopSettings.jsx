import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TokenShopSettings() {
  const [price, setPrice] = useState("");
  const [diamondPrice, setDiamondPrice] = useState("");
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDiamond, setSavingDiamond] = useState(false);
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [storeStart, setStoreStart] = useState("");
  const [storeEnd, setStoreEnd] = useState("");
  const [savingStore, setSavingStore] = useState(false);

  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      if (rows.length > 0) {
        const s = rows[0];
        setSettingsId(s.id);
        setPrice(String(s.vip_pass_price ?? 1));
        setDiamondPrice(String(s.diamond_price ?? 25));
        setStoreEnabled(s.diamond_store_enabled === true);
        setStoreStart(toLocalInput(s.diamond_store_start_time));
        setStoreEnd(toLocalInput(s.diamond_store_end_time));
      } else {
        setPrice("1");
        setDiamondPrice("25");
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

  const handleSaveDiamondPrice = async () => {
    const parsed = parseInt(diamondPrice, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Price must be a whole number of at least 1.");
      return;
    }
    setSavingDiamond(true);
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, { diamond_price: parsed });
    } else {
      const created = await base44.entities.AppSettings.create({ diamond_price: parsed });
      setSettingsId(created.id);
    }
    setSavingDiamond(false);
    toast.success("Diamond price successfully updated!");
  };

  const handleSaveStore = async () => {
    setSavingStore(true);
    const payload = {
      diamond_store_enabled: storeEnabled,
      diamond_store_start_time: storeStart ? new Date(storeStart).toISOString() : null,
      diamond_store_end_time: storeEnd ? new Date(storeEnd).toISOString() : null,
    };
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, payload);
    } else {
      const created = await base44.entities.AppSettings.create(payload);
      setSettingsId(created.id);
    }
    setSavingStore(false);
    toast.success("Diamond Store settings updated!");
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🛒 Token Shop Management</h3>
        <p className="text-sm text-slate-500 mt-0.5">Set token prices for VIP Pass activation and Diamond purchases.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading current prices…
        </div>
      ) : (
        <>
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

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <div className="flex-1 pt-3">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">
                Diamond Price (Tokens)
              </label>
              <input
                type="number"
                min={1}
                value={diamondPrice}
                onChange={(e) => setDiamondPrice(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="pt-8">
              <Button
                onClick={handleSaveDiamondPrice}
                disabled={savingDiamond}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 rounded-xl"
              >
                {savingDiamond ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Price 💎"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">💎 Diamond Store Controls</h4>
              <p className="text-xs text-slate-500 mt-0.5">Enable a limited-time surprise drop for Diamond purchasing.</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Enable Diamond Store</span>
              <button
                onClick={() => setStoreEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${storeEnabled ? "bg-indigo-600" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${storeEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">Opens At</label>
                <input
                  type="datetime-local"
                  value={storeStart}
                  onChange={(e) => setStoreStart(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">Closes At</label>
                <input
                  type="datetime-local"
                  value={storeEnd}
                  onChange={(e) => setStoreEnd(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveStore}
              disabled={savingStore}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 rounded-xl w-full"
            >
              {savingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Diamond Store Settings 💎"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}