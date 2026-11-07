import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { isOneVOneVisible } from "@/lib/oneVOneVisibility";
import NewChallengeAlert from "./NewChallengeAlert";

// Watches for freshly posted 1V1 challenges and pops a short notice at the top
// of the screen. Mounted once at the app root, so it appears on every tab — all
// of them except the 1V1 board, where the live open board already lists the same
// bets. `onView` sends the player to that board.
export default function ChallengeAlertWatcher({ enabled = true, me, onView }) {
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setChallenge(null);
      return undefined;
    }

    const unsubscribe = base44.entities.BeatMyHandChallenge.subscribe((event) => {
      const row = event?.data;
      if (event?.type !== "create") return;
      if (row?.status !== "open" || row?.creator_id === me) return;
      // Already looking at the 1V1 board — nothing to announce.
      if (isOneVOneVisible()) return;
      // Keep the original timer: a second arrival never restarts the countdown.
      setChallenge((prev) => prev ?? row);
    });

    return unsubscribe;
  }, [enabled, me]);

  if (!challenge) return null;

  return (
    <NewChallengeAlert
      challenge={challenge}
      onDismiss={() => setChallenge(null)}
      onView={() => {
        setChallenge(null);
        onView?.();
      }}
    />
  );
}