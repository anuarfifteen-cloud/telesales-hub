import { base44 } from "@/api/base44Client";

/**
 * One-time "Introducing Dealbreaker" announcement.
 *
 * The profile boolean is the source of truth; localStorage mirrors it so a
 * refresh can never flash the modal again while the profile request is still
 * in flight. Marking it seen writes the cache synchronously first.
 */
export const DEALBREAKER_SEEN_KEY = "dealbreaker_announcement_seen";

export function hasSeenDealbreakerAnnouncementCached() {
  try {
    return localStorage.getItem(DEALBREAKER_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export async function markDealbreakerAnnouncementSeen(user) {
  try {
    localStorage.setItem(DEALBREAKER_SEEN_KEY, "true");
  } catch {
    /* private mode — the profile flag still stops it recurring */
  }
  if (user?.hasSeenDealbreakerAnnouncement) return;
  await base44.auth.updateMe({ hasSeenDealbreakerAnnouncement: true }).catch(() => {});
}