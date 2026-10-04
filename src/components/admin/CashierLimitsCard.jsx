import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

// Fallbacks mirror the Cashier's own defaults, used when nothing is saved yet.
const FIELDS = [
  {
    key: "monthly_conversion_cap",
    label: "Monthly tokens → chips cap",
    defaultValue: 1000000,
    hint: "Most tokens a player may convert into chips per Brunei calendar month.",
  },
  {
    key: "daily_cashout_cap",
    label: "Daily chip cash-out cap",
    defaultValue: 5000,
    hint: "Most chips a player may cash back into tokens per Brunei day.",
  },
];

// A whole number of 1 or more, or null when the entry isn't usable.
function parseCap(raw) {
  const text = String(raw ?? "").trim();
  return /^\d+$/.test(text) && Number(text) > 0 ? Number(text) : null;
}

const INITIAL_VALUES = Object.fromEntries(
  FIELDS.map((f) => [f.key, String(f.defaultValue)])
);

// ── Cashier Limits ───────────────────────────────────────────────────
// Writes AppSettings.monthly_conversion_cap / daily_cashout_cap, the ceilings
// the Blackjack 21 Cashier enforces. Changes apply immediately: the Cashier
// re-reads them each time it opens, so a lowered cap blocks the next
// conversion straight away.
export default function CashierLimitsCard() {
  const [settingsId, setSettingsId] = useState(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings
      .list()
      .then((rows) => {
        const s = rows[0];
        if (!s) return;
        setSettingsId(s.id);
        setValues((v) => {
          const next = { ...v };
          FIELDS.forEach((f) => {
            if (Number(s[f.key]) > 0) next[f.key] = String(s[f.key]);
          });
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const invalid = FIELDS.some((f) => parseCap(values[f.key]) === null);
  const canSave = !invalid && !busy;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {};
      FIELDS.forEach((f) => {
        payload[f.key] = parseCap(values[f.key]);
      });
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettingsId(created.id);
      }
      toast.success("Cashier limits saved — they apply immediately.");
    } catch (e) {
      toast.error("Couldn't save limits: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🎯</span>
        <h3 className="font-bold text-foreground text-base">Cashier Limits</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Ceilings on the chip economy. Changes apply immediately — a player already over a lowered cap can't convert again until the limit resets.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const bad = parseCap(values[f.key]) === null;
          return (
            <div key={f.key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {f.label}
              </label>
              <input
                type="number"
                min={1}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className={`text-[11px] mt-1 ${bad ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {bad ? "Enter a whole number of 1 or more." : f.hint}
              </p>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="mt-4 w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Limits
      </button>
    </div>
  );
}