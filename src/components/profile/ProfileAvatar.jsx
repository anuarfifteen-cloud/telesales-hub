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
  sm: { box: "w-9 h-9", icon: "w-5 h-5", text: "text-[11px]", crown: "w-4 h-4 -top-1 -right-1", count: "w-3 h-3 text-[7px]" },
  md: { box: "w-12 h-12", icon: "w-6 h-6", text: "text-sm", crown: "w-5 h-5 -top-1.5 -right-1.5", count: "w-3.5 h-3.5 text-[8px]" },
  lg: { box: "w-20 h-20", icon: "w-10 h-10", text: "text-2xl", crown: "w-7 h-7 -top-2 -right-2", count: "w-5 h-5 text-[10px]" },
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
      {showCrown && championCount > 0 && (
        <span className={`absolute ${s.crown} flex items-center justify-center rounded-full bg-amber-400 text-amber-950 border-2 border-card shadow-md`} title={`Defending champion — ${championCount} title${championCount > 1 ? "s" : ""}`}>
          <span className="leading-none text-[8px]">👑</span>
          {championCount > 1 && (
            <span className={`absolute -bottom-1 -right-1 ${s.count} flex items-center justify-center rounded-full bg-red-500 text-white font-black border border-card`}>
              {championCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
}