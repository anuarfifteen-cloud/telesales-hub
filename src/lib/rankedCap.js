import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { bruneiToday } from "@/lib/bruneiDay";

/**
 * Shared daily Ranked hand cap.
 *
 * Every Ranked table draws from the same per-player allowance: 500 hands per
 * Brunei calendar day. Casual/practice and Chips Arena never read or touch it.
 * A hand already dealt always finishes — only starting a new one is blocked.
 */
export const RANKED_DAILY_CAP = 500;

export const RANKED_CAP_MESSAGE =
  "⚡ Daily Ranked Cap Reached (500/500 Hands) · Refills at Brunei Midnight";

/** Reads a user's cap state, treating a stale cap date as a fresh zero. */
export function capStateFrom(user) {
  const played =
    user?.ranked_cap_date === bruneiToday()
      ? Number(user?.daily_ranked_hands_played) || 0
      : 0;
  return { played, capped: played >= RANKED_DAILY_CAP };
}

export default function useRankedCap(user) {
  const [state, setState] = useState(() => capStateFrom(user));

  // The cached user object can be hours old, so settle the real count once.
  useEffect(() => {
    let active = true;
    base44.auth
      .me()
      .then((fresh) => {
        if (active) setState(capStateFrom(fresh));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  /**
   * Claims one hand from today's allowance: lazily resets the count on a new
   * Brunei day, then increments and saves. Returns false when the cap is
   * already reached, so the caller can leave the table untouched.
   */
  const beginHand = useCallback(async () => {
    const fresh = await base44.auth.me();
    const today = bruneiToday();
    const played =
      fresh?.ranked_cap_date === today
        ? Number(fresh?.daily_ranked_hands_played) || 0
        : 0;

    if (played >= RANKED_DAILY_CAP) {
      setState({ played: RANKED_DAILY_CAP, capped: true });
      return false;
    }

    const next = played + 1;
    await base44.auth.updateMe({
      daily_ranked_hands_played: next,
      ranked_cap_date: today,
    });
    setState({ played: next, capped: next >= RANKED_DAILY_CAP });
    return true;
  }, []);

  return { ...state, beginHand };
}