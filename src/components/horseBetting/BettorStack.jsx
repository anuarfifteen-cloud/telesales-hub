import { useEffect, useState } from "react";

function initialsFrom(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase() || "?";
}

/** One face: the member's photo, or their initials when no photo is available. */
function BettorBubble({ bettor, profile, size, stacked }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [profile?.avatar_photo_url]);

  const photo = profile?.avatar_photo_url && !photoFailed ? profile.avatar_photo_url : "";
  const initials =
    (profile?.avatar_initials || "").trim().slice(0, 2).toUpperCase() ||
    initialsFrom(profile?.full_name || bettor.user_name);

  return (
    <span
      className="relative grid place-items-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: stacked ? -Math.round(size * 0.32) : 0,
        border: "1px solid rgba(6,42,33,0.9)",
        background: photo ? "#0b3b2c" : "#0f5a45",
      }}
      title={profile?.full_name || bettor.user_name || "Player"}
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" onError={() => setPhotoFailed(true)} />
      ) : (
        <span style={{ fontSize: size * 0.42, fontWeight: 900, lineHeight: 1, color: "#fde68a" }}>
          {initials}
        </span>
      )}
    </span>
  );
}

/** Up to three bettor faces for a horse, then a "+N" for the rest. */
export default function BettorStack({ bettors = [], userMap = {}, size = 15 }) {
  if (!bettors.length) return null;
  const shown = bettors.slice(0, 3);
  const extra = bettors.length - shown.length;

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {shown.map((b, i) => (
        <BettorBubble
          key={b.user_id || i}
          bettor={b}
          profile={userMap[b.user_id]}
          size={size}
          stacked={i > 0}
        />
      ))}
      {extra > 0 && <span className="text-[8px] font-black text-amber-200/80">+{extra}</span>}
    </span>
  );
}