import { base44 } from "@/api/base44Client";

/**
 * Publishes the current user's display-only fields into the PublicProfile
 * entity.
 *
 * The built-in User entity only lets admins read other users, so a signed-in
 * member cannot resolve anyone else's photo, initials, ring tier or activity
 * status from it. Each user therefore mirrors their own display fields into
 * PublicProfile — readable by every signed-in member — and the leaderboards
 * read from there.
 *
 * Fire-and-forget: a failed sync must never interrupt app usage.
 */
export async function syncPublicProfile(user) {
  if (!user?.id) return;
  try {
    await base44.entities.PublicProfile.upsert(
      [
        {
          user_id: user.id,
          full_name: user.full_name || user.email?.split("@")[0] || "",
          avatar_photo_url: user.avatar_photo_url || "",
          avatar_initials: user.avatar_initials || "",
          tapVaultBalance: Number(user.tapVaultBalance) || 0,
          lastActiveDate: user.lastActiveDate || "",
          hideFromLeaderboard: user.hideFromLeaderboard === true,
          updated_at: new Date().toISOString(),
        },
      ],
      { key: "user_id" }
    );
  } catch (e) {
    console.warn("PublicProfile sync failed:", e);
  }
}