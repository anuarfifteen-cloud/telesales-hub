import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  ensureDaily,
  recordRankedHand as recordRankedHandLib,
  claimMission as claimMissionLib,
  revealMysteryCard as revealMysteryCardLib,
  revealBonusMysteryCard as revealBonusMysteryCardLib,
} from "@/lib/dailyChallenges";

// Single source of truth for a player's Ranked daily challenges + Daily
// Mystery Card. Loads today's record, subscribes to live changes, and exposes
// the Ranked-only progress + claim/reveal actions. `recordRankedHand` is passed
// down to the Ranked table so settlement is the only thing that advances
// counters.
export default function useDailyChallenges(user, onUserUpdate) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;
  const onUpdateRef = useRef(onUserUpdate);
  onUpdateRef.current = onUserUpdate;

  const reload = useCallback(async () => {
    const u = userRef.current;
    if (!u?.id) return;
    try {
      setDaily(await ensureDaily(u));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const unsub = base44?.entities?.DailyChallenge?.subscribe?.(() => reload());
    return () => unsub && unsub();
  }, [reload]);

  const recordRankedHand = useCallback(async (payload) => {
    const u = userRef.current;
    if (!u?.id) return null;
    try {
      const d = await recordRankedHandLib(u, payload);
      setDaily(d);
      return d;
    } catch {
      return null;
    }
  }, []);

  const claimMission = useCallback(async (slot) => {
    const u = userRef.current;
    if (!u?.id) return null;
    try {
      const d = await claimMissionLib(u, slot);
      setDaily(d);
      await onUpdateRef.current?.();
      return d;
    } catch {
      return null;
    }
  }, []);

  const revealMysteryCard = useCallback(async (selection, reward) => {
    const u = userRef.current;
    if (!u?.id) return null;
    try {
      const d = await revealMysteryCardLib(u, selection, reward);
      setDaily(d);
      await onUpdateRef.current?.();
      return d;
    } catch {
      return null;
    }
  }, []);

  const revealBonusMysteryCard = useCallback(async (selection, reward) => {
    const u = userRef.current;
    if (!u?.id) return null;
    try {
      const d = await revealBonusMysteryCardLib(u, selection, reward);
      setDaily(d);
      await onUpdateRef.current?.();
      return d;
    } catch {
      return null;
    }
  }, []);

  return {
    daily,
    loading,
    reload,
    recordRankedHand,
    claimMission,
    revealMysteryCard,
    revealBonusMysteryCard,
  };
}