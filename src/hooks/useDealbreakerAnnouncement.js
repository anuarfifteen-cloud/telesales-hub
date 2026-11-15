import { useCallback, useEffect, useState } from "react";
import {
  hasSeenDealbreakerAnnouncementCached,
  markDealbreakerAnnouncementSeen } from
"@/lib/dealbreakerAnnouncement";

/**
 * One-time "Introducing Dealbreaker" announcement state.
 *
 * Shows on app load only while the profile flag is false and the localStorage
 * mirror is empty, and never over the Tokens tab (where the game card already
 * sits). Dismissing and the CTA both mark it seen for good.
 */
export default function useDealbreakerAnnouncement({ user, activeTab, onTry }) {
  const [open, setOpen] = useState(false);
  const seenOnProfile = user?.hasSeenDealbreakerAnnouncement === true;

  useEffect(() => {
    if (!user) return;
    if (seenOnProfile) return;
    if (hasSeenDealbreakerAnnouncementCached()) return;
    if (activeTab === "tokens") return;
    setOpen(true);
  }, [user?.id, seenOnProfile, activeTab]);

  const dismiss = useCallback(async () => {
    setOpen(false);
    await markDealbreakerAnnouncementSeen(user);
  }, [user]);

  const tryNow = useCallback(async () => {
    setOpen(false);
    await markDealbreakerAnnouncementSeen(user);
    onTry?.();
  }, [user, onTry]);

  return { open, dismiss, tryNow };
}