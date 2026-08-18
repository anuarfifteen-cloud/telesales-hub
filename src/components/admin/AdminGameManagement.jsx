import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Game Management — admin toggles that control which games are available
// to players in the Tokens menu. Uses the HubSettings singleton (first record).
export default function AdminGameManagement() {
  const [settingsId, setSettingsId] = useState(null);
  const [ninjaActive, setNinjaActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await base44.entities.HubSettings.list();
      const s = rows[0];
      if (s) {
        setSettingsId(s.id);
        setNinjaActive(!!s.isNinjaTokenActive);
      } else {
        setSettingsId(null);
        setNinjaActive(false);
      }
    } catch (e) {
      console.error("[HubSettings] load failed:", e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.HubSettings.subscribe(() => load());
    return unsub;
  }, [load]);

  const handleToggleNinja = async (val) => {
    setToggling(true);
    try {
      const payload = { isNinjaTokenActive: val };
      if (settingsId) {
        await base44.entities.HubSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.HubSettings.create(payload);
        setSettingsId(created.id);
      }
      setNinjaActive(val);
      toast.success(val ? "Ninja Token game enabled." : "Ninja Token game disabled.");
    } catch (e) {
      toast.error("Failed to update setting: " + (e?.message || "Unknown error"));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className="bg-white dark:bg-card rounded-2xl border border-border p-5 space-y-4"
      style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}
    >
      <div>
        <h3 className="font-bold text-slate-900 dark:text-foreground text-base">🎮 Game Management</h3>
        <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
          Control which games are available to players in the Tokens menu.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="font-semibold text-slate-900 dark:text-foreground text-sm">
              Enable Ninja Token Game
            </p>
            <p
              className={`text-xs font-semibold mt-0.5 ${
                ninjaActive ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {ninjaActive
                ? "Available — players can access it"
                : "Hidden — shows as COMING SOON"}
            </p>
          </div>
          <button
            onClick={() => handleToggleNinja(!ninjaActive)}
            disabled={toggling}
            className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              ninjaActive ? "bg-emerald-500" : "bg-slate-300"
            }`}
            style={{ width: "52px" }}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 text-slate-600 mx-auto" />
            ) : (
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  ninjaActive ? "translate-x-7" : "translate-x-1"
                }`}
              />
            )}
          </button>
        </div>
      )}
    </div>
  );
}