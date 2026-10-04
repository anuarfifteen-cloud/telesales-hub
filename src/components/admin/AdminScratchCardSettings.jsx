import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Admin switch for the Premium Scratch Card sub-tab. While off, players see a
 * "Coming Soon 👀" placeholder and only admins — after the admin PIN — can play.
 */
export default function AdminScratchCardSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: settingsRows = [] } = useQuery({
    queryKey: ["appSettingsScratchCard"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const settings = settingsRows[0];
  const enabled = settings?.scratch_card_enabled !== false;

  const toggle = async () => {
    setSaving(true);
    try {
      const payload = { scratch_card_enabled: !enabled };
      if (settings) {
        await base44.entities.AppSettings.update(settings.id, payload);
      } else {
        await base44.entities.AppSettings.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["appSettingsScratchCard"] });
      toast.success(
        !enabled
          ? "🎫 Scratch Card is now live for players."
          : "🙈 Scratch Card hidden — players see 'Coming Soon 👀'."
      );
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 dark:text-foreground text-base">🎫 Scratch Card — Available to Players</h3>
        <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
          When off, the sub-tab is replaced with "Coming Soon 👀" for players. Admins can still open the game after entering the admin PIN.
        </p>
        <p className={`text-xs font-semibold mt-1 ${enabled ? "text-emerald-600" : "text-red-500"}`}>
          {enabled ? "Currently LIVE" : "Currently HIDDEN (Coming Soon 👀)"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        aria-label="Toggle Scratch Card availability"
        className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
        style={{ width: "52px" }}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}