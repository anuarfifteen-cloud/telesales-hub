import { User } from "lucide-react";
import { getVaultTier } from "@/lib/vaultTiers";

// Ring color per Vault tier. No tier → neutral slate ring.
const TIER_RING = {
  Platinum: "#22d3ee",
  Diamond: "#38bdf8",
  Gold: "#f59e0b",
  Silver: "#cbd5e1",
  Bronze: "#fb923c",
};

const SIZES = {
  sm: { box: "w-9 h-9", icon: "w-5 h-5", text: "text-[11px]" },
  md: { box: "w-12 h-12", icon: "w-6 h-6", text: "text-sm" },
  lg: { box: "w-20 h-20", icon: "w-10 h-10", text: "text-2xl" },
};

// Reusable avatar: tier-colored ring + photo (or custom initials, or default
// silhouette) + optional champion crown with title count.
export default function ProfileAvatar({ user, size = "md", showCrown = false, championCount = 0, className = "" }) {
  const balance = Number(user?.tapVaultBalance) || 0;
  const tier = getVaultTier(balance);
  const ringColor = tier ? TIER_RING[tier.title] : "#cbd5e1";
  const photo = user?.avatar_photo_url;
  const customInitials = (user?.avatar_initials || "").trim().slice(0, 2).toUpperCase();
  const fallbackInitials = customInitials || (user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] || "").toUpperCase());
  const s = SIZES[size] || SIZES.md;
  const showSilhouette = !photo && !fallbackInitials;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${s.box} rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/70 to-primary`}
        style={{ boxShadow: `0 0 0 3px ${ringColor}` }}
      >
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : showSilhouette ? (
          <User className={`${s.icon} text-primary-foreground`} />
        ) : (
          <span className={`font-bold text-primary-foreground ${s.text}`}>{fallbackInitials}</span>
        )}
      </div>
    </div>
  );
}