import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import NewChallengeAlert from "./NewChallengeAlert";

// Watches for freshly posted 1V1 challenges and pops a one-second notice at the
// top of the screen. Mounted by the Blackjack 21 tab for every sub-tab except
// 1V1, where the live open board already shows the same bets.
export default function ChallengeAlertWatcher({ enabled = true, me }) {
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
      // Keep the original timer: a second arrival never restarts the countdown.
      setChallenge((prev) => prev ?? row);
    });

    return unsubscribe;
  }, [enabled, me]);

  if (!challenge) return null;

  return <NewChallengeAlert challenge={challenge} onDismiss={() => setChallenge(null)} />;
}