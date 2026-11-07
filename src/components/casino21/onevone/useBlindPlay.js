import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BLIND_WAIT_MS, resolveHands } from "@/lib/beatMyHand";

// Simultaneous blind play — standard format only.
//
// Both players play their own hand at the same time and nothing is written while
// cards are drawn. Each side then writes ONLY its own score fields, so the two
// submissions can never overwrite each other. The player who submits second is
// the single designated settler; the other one only watches. A client can move
// only its own wallet, so each device credits its own payout exactly once,
// guarded by its own claim flag.
export default function useBlindPlay({
  me,
  onUserUpdate,
  autoCredit,
  load,
  backToLobby,
  setBusy,
  setWaiting,
  setTarget,
  setResultsFor,
  setShowdown,
  setMode,
  setStep,
  toast,
}) {
  const [blind, setBlind] = useState(null);

  // Compare the two finished hands and call the pot. Claim flags are
  // deliberately left untouched, so a duplicate settle write can never re-open a
  // payout this device has already credited.
  const settleBlind = async (row) => {
    const res = resolveHands(row.creator_score, row.opponent_score, row.wager);
    const settled = {
      ...row,
      status: "settled",
      outcome: res.outcome,
      creator_payout: res.creatorPayout,
      opponent_payout: res.opponentPayout,
    };
    await base44.entities.BeatMyHandChallenge.update(row.id, {
      status: "settled",
      outcome: res.outcome,
      creator_payout: res.creatorPayout,
      opponent_payout: res.opponentPayout,
      settled_at: new Date().toISOString(),
    });
    await autoCredit(settled);
    await onUserUpdate?.();
    return settled;
  };

  // The poster reads the result in the Lobby, the challenger in-line under the
  // table — the same showdown UI in both seats.
  const present = (row) => {
    setBlind(null);
    if (row.creator_id === me) {
      setWaiting(null);
      setResultsFor(row);
      setMode("lobby");
      setStep("wager");
    } else {
      setShowdown(row);
      setMode("accept");
      setStep("showdown");
    }
  };

  // The waiting client voids the match when the opponent never finishes: both
  // stakes come back and it stands down. It can only ever fire once.
  const voidBlind = async (row) => {
    if (!row?.id) return;
    setBusy(true);
    try {
      const fresh = await base44.entities.BeatMyHandChallenge.get(row.id);
      if (fresh?.status === "open") {
        const stake = Number(fresh.wager) || 0;
        const voided = {
          ...fresh,
          status: "expired",
          outcome: "void",
          creator_payout: stake,
          opponent_payout: stake,
        };
        await base44.entities.BeatMyHandChallenge.update(fresh.id, {
          status: "expired",
          outcome: "void",
          creator_payout: stake,
          opponent_payout: stake,
          settled_at: new Date().toISOString(),
        });
        await autoCredit(voided);
        toast.error("Opponent timed out — the match is voided and both stakes returned.", {
          duration: 7000,
        });
      }
    } catch {
      toast.error("Opponent timed out — your stake is in the Lobby to collect.", {
        duration: 7000,
      });
    } finally {
      setBusy(false);
      backToLobby();
      load();
    }
  };

  // The wait screen hands back the live record: call the pot if both hands are
  // in but nobody has settled it yet, otherwise just show the finished match.
  const handleBlindRow = async (row) => {
    try {
      if (row.status === "open") {
        present(await settleBlind(row));
      } else {
        await autoCredit(row);
        present(row);
      }
    } finally {
      load();
    }
  };

  // Writes only the poster's own fields, then either settles (both hands in) or
  // opens the 90-second wait for the opponent.
  const submitCreatorHand = async (waiting, score, cards) => {
    if (!waiting?.id) return;
    setBusy(true);
    try {
      const fresh = await base44.entities.BeatMyHandChallenge.get(waiting.id);
      if (!fresh || fresh.status !== "open") {
        toast.error("That challenge closed — your stake is returned.", { duration: 7000 });
        await autoCredit(fresh || waiting);
        backToLobby();
        return;
      }
      const bothIn = Number(fresh.opponent_submitted_at) > 0;
      const now = Date.now();
      const patch = {
        creator_score: score,
        creator_cards: Array.isArray(cards) ? cards : [],
        creator_submitted_at: now,
        ...(bothIn ? {} : { settle_deadline: now + BLIND_WAIT_MS }),
      };
      await base44.entities.BeatMyHandChallenge.update(fresh.id, patch);
      const merged = { ...fresh, ...patch };
      setWaiting(merged);
      if (bothIn) {
        present(await settleBlind(merged));
        load();
      } else {
        setBlind(merged);
        setMode("blind");
      }
    } catch {
      toast.error("Couldn't submit that hand — try again.");
    } finally {
      setBusy(false);
    }
  };

  // The challenger's mirror of the above: their own fields only.
  const submitChallengerHand = async (target, score, cards) => {
    if (!target?.id) return;
    setBusy(true);
    try {
      const fresh = await base44.entities.BeatMyHandChallenge.get(target.id);
      if (!fresh || fresh.status !== "open") {
        toast.error("That challenge closed — your stake is returned.", { duration: 7000 });
        await autoCredit(fresh || target);
        backToLobby();
        await load();
        return;
      }
      const bothIn = Number(fresh.creator_submitted_at) > 0;
      const now = Date.now();
      const patch = {
        opponent_score: score,
        opponent_cards: Array.isArray(cards) ? cards : [],
        opponent_submitted_at: now,
        ...(bothIn ? {} : { settle_deadline: now + BLIND_WAIT_MS }),
      };
      await base44.entities.BeatMyHandChallenge.update(fresh.id, patch);
      const merged = { ...fresh, ...patch };
      setTarget(merged);
      if (bothIn) {
        present(await settleBlind(merged));
        await load();
      } else {
        setBlind(merged);
        setMode("blind");
      }
    } catch {
      toast.error("Couldn't submit that hand — try again.");
    } finally {
      setBusy(false);
    }
  };

  return { blind, setBlind, submitCreatorHand, submitChallengerHand, handleBlindRow, voidBlind };
}