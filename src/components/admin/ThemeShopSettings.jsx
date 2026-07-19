import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ThemeShopSettings() {
  const [price, setPrice] = useState("30");
  const [discount, setDiscount] = useState("0");
  const [offerActive, setOfferActive] = useState(false);
  const [offerEnd, setOfferEnd] = useState("");
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      if (rows.length > 0) {
        const s = rows[0];
        setSettingsId(s.id);
        setPrice(String(s.theme_shop_price ?? 30));
        setDiscount(String(s.theme_discount_percent ?? 0));
        setOfferActive(s.theme_offer_active === true);
        setOfferEnd(toLocalInput(s.theme_offer_end_time));
      } else {
        setPrice("30");
        setDiscount("0");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const parsedPrice = parseFloat(price);
    const parsedDiscount = parseInt(discount, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a valid number.");
      return;
    }
    if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      toast.error("Discount must be a whole number between 0 and 100.");
      return;
    }
    if (offerActive && !offerEnd) {
      toast.error("Please set an offer end time when the offer is active.");
      return;
    }
    setSaving(true);
    const payload = {
      theme_shop_price: parsedPrice,
      theme_discount_percent: parsedDiscount,
      theme_offer_active: offerActive,
      theme_offer_end_time: offerEnd ? new Date(offerEnd).toISOString() : null,
    };
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettingsId(created.id);
      }
      toast.success("Theme Shop pricing updated!");
    } catch (e) {
      toast.error("Save failed: " + (e?.message || "Unknown error"));
    }
    setSaving(false);
  };

  const parsedPrice = parseFloat(price);
  const parsedDiscount = parseInt(discount, 10);
  const effectivePrice = Math.ceil((parsedPrice || 30) * (1 - ((parsedDiscount || 0) / 100)));

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🎨 Theme Shop Pricing</h3>
        <p className="text-sm text-slate-500 mt-0.5">Set theme prices, run percentage discounts, and create limited-time offers with a countdown timer.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading current settings…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">
                Theme Price (Tokens)
              </label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest block">Limited-Time Offer</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Shows a countdown timer in the shop to create urgency.</p>
              </div>
              <button
                onClick={() => setOfferActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${offerActive ? "bg-rose-500" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${offerActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-1">Offer Ends At</label>
              <input
                type="datetime-local"
                value={offerEnd}
                onChange={(e) => setOfferEnd(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {!offerActive && discount > 0 && (
                <p className="text-[11px] text-rose-500 mt-1">⚠ Discount won't show to users unless the offer is toggled ON.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-2">
            <Palette className="w-4 h-4 text-amber-500 flex-shrink-0" />
            {offerActive && parsedDiscount > 0
              ? `Live: ${effectivePrice} tokens (was ${Math.round(parsedPrice || 30)})`
              : `Live price: ${Math.round(parsedPrice || 30)} tokens (no discount active)`}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold gap-1.5 rounded-xl w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Theme Shop Settings 🎨"}
          </Button>
        </>
      )}
    </div>
  );
}