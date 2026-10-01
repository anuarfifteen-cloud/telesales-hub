import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function AvatarInitialsEditor({ user, onUserUpdate }) {
  const [value, setValue] = useState(user?.avatar_initials || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cleaned = value.trim().slice(0, 2).toUpperCase();
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_initials: cleaned });
      await onUserUpdate?.();
      setValue(cleaned);
      toast.success(cleaned ? `Initials set to ${cleaned}` : "Initials cleared");
    } catch (e) {
      toast.error("Failed to save initials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base">🔤</span>
        <div>
          <span className="text-sm font-medium text-foreground">Display Initials</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Up to 2 letters — overrides the auto-generated avatar initials.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 2).toUpperCase())}
          placeholder="AJ"
          maxLength={2}
          className="w-14 text-center text-sm font-bold rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>
    </div>
  );
}