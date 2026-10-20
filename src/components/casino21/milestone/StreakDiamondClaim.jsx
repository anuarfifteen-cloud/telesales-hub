import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { payPendingStreakDiamond } from "@/lib/milestoneStreak";

// Collects the season-end 💎 Streak Crown Diamond for the player who held the
// highest Ranked win streak. The claim itself is written by the player who
// claimed Rank 10, so payouts to anyone else are credited here the next time
// that player opens the RANK area — guarded by the persisted paid marker.
export default function StreakDiamondClaim({ user, onUserUpdate }) {
  const done = useRef(false);

  useEffect(() => {
    if (!user?.id || done.current) return;
    done.current = true;
    (async () => {
      try {
        const paid = await payPendingStreakDiamond(user);
        if (!paid) return;
        await onUserUpdate?.();
        toast.success(
          `🔥 Streak King! +1 💎 for your ${paid.wins}-win season streak.`
        );
      } catch {
        /* best-effort — the marker is reverted so a later visit retries */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}