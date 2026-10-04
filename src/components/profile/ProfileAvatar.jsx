import { User } from "lucide-react";
import { getVaultTier } from "@/lib/vaultTiers";
import AvatarOnlineDot from "./AvatarOnlineDot";

// Tier rings are pure CSS: a crisp 2px border plus a soft glow. Platinum swaps
// the flat border for a blue → purple gradient rim with an ambient glow.
const RINGS = {
  Bronze: { color: "#c2703a", glow: "0 0 6px rgba(194,112,58,0.45)" },
  Silver: { color: "#cbd5e1", glow: "0 0 6px rgba(148,163,184,0.45)" },
  Gold: { color: "#f5b301", glow: "0 0 10px rgba(250,204,21,0.55)" },
  Diamond: { color: "#22d3ee", glow: "0 0 12px rgba(56,189,248,0.7)" },
  Platinum: {
    gradient: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #6366f1 100%)",
    glow: "0 0 12px rgba(139,92,246,0.6), 0 0 26px rgba(99,102,241,0.35)",
  },
};
const NEUTRAL = { color: "#cbd5e1", glow: "none" };

const SIZES = {
  sm: { box: "w-9 h-9", icon: "w-5 h-5", text: "text-[11px]" },
  md: { box: "w-12 h-12", icon: "w-6 h-6", text: "text-sm" },
  lg: { box: "w-20 h-20", icon: "w-10 h-10", text: "text-2xl" },
};

function bruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
}

// Reusable avatar: clean circular tier ring + photo (or custom initials, or
// default silhouette). `leaderboard` adds the online dot and a slight size
// emphasis for Platinum leaders.
export default function ProfileAvatar({
  user,
  size = "md",
  showCrown = false,
  championCount = 0,
  className = "",
  leaderboard = false,
}) {
  const balance = Number(user?.tapVaultBalance) || 0;
  const tier = getVaultTier(balance);
  const ring = (tier && RINGS[tier.title]) || NEUTRAL;
  const platinum = tier?.title === "Platinum";
  const photo = user?.avatar_photo_url;
  const customInitials = (user?.avatar_initials || "").trim().slice(0, 2).toUpperCase();
  const fallbackInitials = customInitials || (user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] || "").toUpperCase());
  const s = SIZES[size] || SIZES.md;
  const showSilhouette = !photo && !fallbackInitials;
  const online = !!user?.lastActiveDate && user.lastActiveDate === bruneiToday();

  const inner = (
    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/70 to-primary">
      {photo ? (
        <img src={photo} alt="" className="w-full h-full object-cover" />
      ) : showSilhouette ? (
        <User className={`${s.icon} text-primary-foreground`} />
      ) : (
        <span className={`font-bold text-primary-foreground ${s.text}`}>{fallbackInitials}</span>
      )}
    </div>
  );

  const circle = platinum ? (
    <div
      className={`${s.box} rounded-full`}
      style={{ padding: "2px", background: RINGS.Platinum.gradient, boxShadow: RINGS.Platinum.glow }}
    >
      {inner}
    </div>
  ) : (
    <div
      className={`${s.box} rounded-full overflow-hidden`}
      style={{ border: `2px solid ${ring.color}`, boxShadow: ring.glow }}
    >
      {inner}
    </div>
  );

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${leaderboard && platinum ? "scale-110" : ""} ${className}`}
    >
      {circle}
      {leaderboard && <AvatarOnlineDot online={online} size={size} />}
    </div>
  );
}