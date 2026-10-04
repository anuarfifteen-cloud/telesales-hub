import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Admin control for the Village Builder game. The first (and main) control is
// the visibility toggle: off = only a PIN-unlocked admin can see the sub-tab;
// on = the Village sub-tab appears for every player in the Tokens tab.
export default function AdminVillageGame() {
  const [settingsId, setSettingsId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AppSettings.list()
      .then((rows) => {
        const s = rows[0];
        if (s) {
          setSettingsId(s.id);
          setEnabled(s.village_enabled === true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (val) => {
    setEnabled(val);
    const payload = { village_enabled: val };
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, payload);
    } else {
      const created = await base44.entities.AppSettings.create(payload);
      setSettingsId(created.id);
    }
    toast.success(
      val
        ? "Village Builder is now VISIBLE to all players."
        : "Village Builder hidden — admin preview only."
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-lime-600 to-emerald-600 p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Panel</p>
        <p className="font-black text-lg">🏘️ Village Builder</p>
        <p className="text-xs opacity-80">Place buildings, earn resources, complete quests for tokens</p>
      </div>

      {/* Visibility toggle — the primary control */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Game Visible to All Players</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              When off, the Village sub-tab only appears for an admin who has unlocked Admin Mode
              with the PIN. When on, everyone sees it in the Tokens tab.
            </p>
            <p className={`mt-1 text-xs font-semibold ${enabled ? "text-emerald-600" : "text-slate-400"}`}>
              {enabled ? "Currently VISIBLE to everyone" : "Currently HIDDEN (admin preview only)"}
            </p>
          </div>
          <button
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
            style={{ width: "52px" }}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How it works</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• Buildings cost gold, wood and food, then produce resources on a timer.</li>
          <li>• Each quest in the chain pays tokens to the player's balance and logs to the Token Log.</li>
          <li>• Village progress is saved to the player's account and ranks them on the Village leaderboard.</li>
        </ul>
      </div>
    </div>
  );
}