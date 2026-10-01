import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Lock } from "lucide-react";
import { getVaultTier } from "@/lib/vaultTiers";

// Profile photo upload is a Silver-tier (Vault) exclusive. Users below Silver
// see a locked "Silver Tier onwards — Exclusive" notice and no upload control.
// Any previously uploaded photo still renders via ProfileAvatar.
export default function AvatarPhotoEditor({ user, onUserUpdate }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const hasPhoto = !!user?.avatar_photo_url;

  const tier = getVaultTier(user?.tapVaultBalance);
  const canUpload = tier && ["Platinum", "Diamond", "Gold", "Silver"].includes(tier.title);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4 MB).");
      return;
    }
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.auth.updateMe({ avatar_photo_url: file_url });
      await onUserUpdate?.();
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error("Upload failed: " + (err?.message || "Unknown error"));
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await base44.auth.updateMe({ avatar_photo_url: "" });
      await onUserUpdate?.();
      toast.success("Photo removed.");
    } catch {
      toast.error("Failed to remove photo.");
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base">📸</span>
        <div>
          <span className="text-sm font-medium text-foreground">Profile Photo</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Shown on your profile & all leaderboards.
          </p>
        </div>
      </div>

      {canUpload ? (
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {hasPhoto ? "Change" : "Upload"}
          </button>
          {hasPhoto && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center justify-center text-xs font-bold rounded-lg border border-red-300 text-red-600 px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
              aria-label="Remove photo"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1">
          <Lock className="w-3 h-3" />
          Silver Tier onwards — Exclusive
        </span>
      )}
    </div>
  );
}