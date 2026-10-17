import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  RANKS,
  addWinPayout,
  claimRankReward,
  getSeason,
} from "@/lib/milestone";

// Tracks the current player's seasonal score and the queue of newly-reached
// ranks waiting for a claim popup. `recordWin(chipPayout)` is called from the
// Blackjack game on every win; it appends any new ranks to the queue.
export default function useMilestoneClaim(user) {
  const [queue, setQueue] = useState([]);
  const [season, setSeason] = useState(null);
  const userRef = useRef(user);
  userRef.current = user;

  const refreshSeason = async () => {
    try {
      const s = await getSeason();
      setSeason(s);
      return s;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    refreshSeason();
    const unsub = base44?.entities?.MilestoneSeason?.subscribe?.(() => refreshSeason());
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The score write is deliberately NOT swallowed here: the Ranked table awaits
  // this call and reports a failure, so a lost update can never pass unnoticed.
  const recordWin = async (chipPayout) => {
    const u = userRef.current;
    if (!u?.id) return;
    const res = await addWinPayout(
      u.id,
      u.full_name || u.email || "Player",
      chipPayout
    );
    if (res?.newRanks?.length) {
      setQueue((q) => [...q, ...res.newRanks]);
    }
    await refreshSeason();
  };

  const currentClaim = queue.length
    ? RANKS.find((r) => r.rank === queue[0]) || null
    : null;

  const confirmClaim = async () => {
    const u = userRef.current;
    if (!currentClaim || !u?.id) return;
    try {
      await claimRankReward(u.id, currentClaim.rank);
    } catch {
      /* ignore */
    } finally {
      setQueue((q) => q.slice(1));
    }
  };

  const dismissClaim = () => setQueue((q) => q.slice(1));

  return { recordWin, currentClaim, confirmClaim, dismissClaim, season, refreshSeason };
}