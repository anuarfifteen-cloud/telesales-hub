import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Swords } from "lucide-react";
import LocalHand from "./LocalHand";
import HandPanel from "../HandPanel";
import ChallengeCard from "./ChallengeCard";
import OpenBetsBoard from "./OpenBetsBoard";
import ChallengerResultSwap from "./ChallengerResultSwap";
import GameRecentBracket from "./GameRecentBracket";
import ChipBalanceStrip from "./ChipBalanceStrip";
import WagerLockCard from "./WagerLockCard";
import ShowdownReveal from "./ShowdownReveal";
import BestOfThreeShowdown from "./BestOfThreeShowdown";
import BestOfThreePlay from "./BestOfThreePlay";
import FormatToggle from "./FormatToggle";
import { logChipMovement } from "@/lib/chipLog";
import {
  CHALLENGE_TTL_MS,
  TURN_SECONDS,
  WAGER_PRESETS,
  canAffordStake,
  formatOf,
  handsOf,
  isExpired,
  resolveHands,
  resolveMatch,
  secondsLeft,
  stakeLabel,
  stakeTypeOf,
  walletFieldFor,
} from "@/lib/beatMyHand";

// Silent safety-net poll for the open board — only ever runs while the board
// is actually on screen, so it costs nothing once the player leaves the tab.
const BOARD_POLL_MS = 5000;

const FELT = {
  background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
};

export default function BeatMyHandView({ user, onUserUpdate }) {
  const me = user?.id;
  const myName = user?.full_name || user?.email?.split("@")[0] || "Player";
  const chips = Number(user?.casinoChips) || 0;
  const diamonds = Number(user?.diamonds) || 0;

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("lobby"); // lobby | create | accept
  const [step, setStep] = useState("wager"); // wager | play | showdown
  const [wager, setWager] = useState(WAGER_PRESETS[0]);
  // Which wallet the selected stake lives in: "chips" or "diamond".
  const [stakeType, setStakeType] = useState("chips");
  // The format being posted: one hand, or a three-hand match.
  const [format, setFormat] = useState("standard");
  const [finalScore, setFinalScore] = useState(null);
  const [handCards, setHandCards] = useState([]);
  // A Best of 3 player's three finished hands, in order.
  const [myHands, setMyHands] = useState([]);
  // The finished hand or match is ready to post (drives the auto-post clock).
  const [readyToPost, setReadyToPost] = useState(false);
  const [target, setTarget] = useState(null);
  const [showdown, setShowdown] = useState(null);
  // A finished challenge opened from the board or Recent — replays the showdown.
  const [resultsFor, setResultsFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [handKey, setHandKey] = useState(0);
  const [postFailed, setPostFailed] = useState(false);
  // The posted challenge the creator is sitting on in the live waiting room.
  const [waiting, setWaiting] = useState(null);
  const [, setTick] = useState(0);
  // The challenger's hand can only be settled once, whichever path ended it.
  const settlingRef = useRef(false);
  // A finished hand can only be posted once, auto or manual.
  const postingRef = useRef(false);
  // Why a settlement could not be written — shown in place, never a silent exit.
  const [settleError, setSettleError] = useState(null);
  // Nothing else to hold: the stake-taken flag is stored on the challenge itself.

  // Live countdown on the board.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Automatic payout ────────────────────────────────────────────────
  // There is no claim step: the winner is paid the moment the match settles.
  // A client can only move its own wallet, so each device credits its own side
  // as soon as it sees the settled record — at settlement, from the live
  // waiting room, and on any later board load.
  const payingRef = useRef(new Set());
  const autoCredit = useCallback(
    async (row) => {
      if (!row?.id || row.status === "open") return;
      const side =
        row.creator_id === me ? "creator" : row.opponent_id === me ? "opponent" : null;
      if (!side) return;
      const amount = Number(side === "creator" ? row.creator_payout : row.opponent_payout) || 0;
      const claimed = side === "creator" ? !!row.creator_claimed : !!row.opponent_claimed;
      const key = `${row.id}:${side}`;
      if (amount <= 0 || claimed || payingRef.current.has(key)) return;
      payingRef.current.add(key);
      try {
        const wallet = walletFieldFor(stakeTypeOf(row));
        const fresh = await base44.auth.me();
        const after = (Number(fresh?.[wallet]) || 0) + amount;
        // Credit the wallet BEFORE marking the payout claimed, so a failed
        // credit stays collectable instead of being lost for good.
        await base44.auth.updateMe({ [wallet]: after });
        await base44.entities.BeatMyHandChallenge.update(row.id, {
          [side === "creator" ? "creator_claimed" : "opponent_claimed"]: true,
        });
        if (stakeTypeOf(row) === "chips") {
          logChipMovement({
            user,
            mode: "wallet",
            action_type: amount > (Number(row.wager) || 0) ? "win" : "push",
            amount,
            balance_after: after,
            detail:
              row.outcome === "expired"
                ? `Beat My Hand — expired challenge refunded (${stakeLabel(amount, "chips")})`
                : `Beat My Hand — winnings credited (${stakeLabel(amount, "chips")})`,
          });
        }
        await onUserUpdate?.();
      } catch {
        // Left unclaimed so the board's pending list can still pay it out.
        payingRef.current.delete(key);
      }
    },
    [me, user, onUserUpdate]
  );

  // ── Lazy 90-second expiry ───────────────────────────────────────────
  // Any player loading the board sweeps stale challenges and releases the
  // original stake back to its creator (collected by them on their own device).
  const sweepExpired = async (rows) => {
    const stale = rows.filter(isExpired);
    if (!stale.length) return rows;
    await Promise.all(
      stale.map((c) =>
        base44.entities.BeatMyHandChallenge.update(c.id, {
          status: "expired",
          outcome: "expired",
          creator_payout: Number(c.wager) || 0,
          opponent_payout: 0,
          creator_claimed: false,
          settled_at: new Date().toISOString(),
        })
      )
    );
    return rows.map((c) =>
      stale.some((s) => s.id === c.id)
        ? {
            ...c,
            status: "expired",
            outcome: "expired",
            creator_payout: Number(c.wager) || 0,
            creator_claimed: false,
          }
        : c
    );
  };

  // Every refresh stamps a sequence number. A slow response that lands after a
  // newer one must never write its stale snapshot over fresher board data —
  // that race is what made a newly posted fight flash up and then vanish.
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      const [openRes, mineRes] = await Promise.all([
        base44.entities.BeatMyHandChallenge.filter(
          { status: "open" },
          { sort: "-created_date", limit: 40 }
        ),
        base44.entities.BeatMyHandChallenge.filter(
          { $or: [{ creator_id: me }, { opponent_id: me }] },
          { sort: "-created_date", limit: 25 }
        ),
      ]);
      // A newer refresh already answered — drop this older snapshot entirely.
      if (seq !== loadSeqRef.current) return;
      const byId = new Map();
      [...(openRes?.items || []), ...(mineRes?.items || [])].forEach((c) =>
        byId.set(c.id, c)
      );
      const rows = await sweepExpired([...byId.values()]);
      rows.sort((a, b) =>
        String(b.created_date || "").localeCompare(String(a.created_date || ""))
      );
      setChallenges(rows);
      // Pay out anything this player is owed on their own device.
      rows.forEach((row) => autoCredit(row));
    } catch {
      // Never blank the board on a failed refresh: the last good list stays on
      // screen, so a live fight cannot disappear over one hiccuped query.
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [me, autoCredit]);

  // Held in a ref so the realtime channel below is never torn down and
  // re-subscribed just because the player record refreshed — every gap in the
  // subscription was a missed event, leaving the lobby stale.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load();
  }, [load]);

  // ── Live board ──────────────────────────────────────────────────────
  // Runs only while the open board is on screen: realtime events keep it
  // current, and a silent 5-second poll covers any missed event. Both are
  // torn down the instant the player leaves the tab or steps into a hand, and
  // nothing refreshes while the browser tab itself is hidden.
  useEffect(() => {
    // Live while the main board is up, and while a settled match shows the
    // challenger the inline board under their result.
    const boardOnScreen = mode === "lobby" || (mode === "accept" && step === "showdown");
    if (!boardOnScreen) return undefined;

    let active = true;
    const refresh = () => {
      if (active && !document.hidden) loadRef.current?.();
    };

    const unsubscribe = base44.entities.BeatMyHandChallenge.subscribe((event) => {
      if (!event) return;
      // Apply the change the instant it arrives instead of waiting for a round
      // trip, so a freshly posted fight shows on the lobby immediately. A
      // partial update event is merged onto the record already on screen.
      const row = event.data;
      if (row?.id) {
        setChallenges((prev) => {
          if (event.type === "delete") return prev.filter((c) => c.id !== row.id);
          const exists = prev.some((c) => c.id === row.id);
          return exists
            ? prev.map((c) => (c.id === row.id ? { ...c, ...row } : c))
            : [row, ...prev];
        });
      }
      refresh();
    });

    const poll = setInterval(refresh, BOARD_POLL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      unsubscribe();
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mode, step]);

  const payoutFor = (c) =>
    Number(c.creator_id === me ? c.creator_payout : c.opponent_payout) || 0;
  const claimedFor = (c) =>
    c.creator_id === me ? !!c.creator_claimed : !!c.opponent_claimed;

  const myRows = challenges.filter((c) => c.creator_id === me || c.opponent_id === me);
  const board = challenges.filter(
    (c) => c.status === "open" && c.creator_id !== me && c.opponent_id !== me
  );
  const myOpen = myRows.filter((c) => c.status === "open");
  const myClaims = myRows.filter((c) => c.status !== "open" && payoutFor(c) > 0 && !claimedFor(c));

  const backToLobby = () => {
    setMode("lobby");
    setStep("wager");
    setTarget(null);
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setReadyToPost(false);
    setShowdown(null);
    setWaiting(null);
    setSettleError(null);
  };

  // ── Create ──────────────────────────────────────────────────────────
  const startCreate = () => {
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setReadyToPost(false);
    setPostFailed(false);
    setStep("wager");
    setMode("create");
  };

  // Cards are dealt only after the wager is locked.
  const lockCreateWager = () => {
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setReadyToPost(false);
    setPostFailed(false);
    setHandKey((k) => k + 1);
    setStep("play");
  };

  const handDone = useCallback((score, cards) => {
    setFinalScore(score);
    setHandCards(Array.isArray(cards) ? cards : []);
    setReadyToPost(true);
  }, []);

  // Best of 3: all three hands are in, so the match can go on the board.
  const matchDone = useCallback((hands) => {
    setMyHands(hands);
    setReadyToPost(true);
  }, []);

  const postChallenge = async () => {
    if (!readyToPost || postingRef.current) return;
    postingRef.current = true;
    setBusy(true);
    setPostFailed(false);
    try {
      const wallet = walletFieldFor(stakeType);
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.[wallet]) || 0;
      if (balance < wager) {
        toast.error(
          `Not enough ${stakeType === "diamond" ? "Diamonds" : "chips"} for that wager.`
        );
        backToLobby();
        return;
      }
      const after = balance - wager;
      await base44.auth.updateMe({ [wallet]: after });
      const isMatch = format === "best_of_3";
      const created = await base44.entities.BeatMyHandChallenge.create({
        creator_id: me,
        creator_name: myName,
        // A standard match keeps its single hand in these fields; a Best of 3
        // keeps hand 1 here and all three in creator_hands.
        creator_score: isMatch ? Number(myHands[0]?.score) || 0 : finalScore,
        creator_cards: isMatch ? myHands[0]?.cards || [] : handCards,
        ...(isMatch ? { format: "best_of_3", creator_hands: myHands } : {}),
        wager,
        stake_type: stakeType,
        status: "open",
        expires_at: Date.now() + CHALLENGE_TTL_MS,
        creator_payout: 0,
        opponent_payout: 0,
        creator_claimed: false,
        opponent_claimed: false,
      });
      // The chip ledger tracks chips only — a Diamond stake stays in the wallet.
      if (stakeType === "chips") {
        logChipMovement({
          user,
          mode: "wallet",
          action_type: "bet",
          amount: -wager,
          balance_after: after,
          detail: isMatch
            ? `Beat My Hand Best of 3 posted — ${stakeLabel(wager, "chips")}`
            : `Beat My Hand challenge posted — ${stakeLabel(wager, "chips")} (hand ${finalScore})`,
        });
      }
      await onUserUpdate?.();
      await load();
      // Stay on the felt: cards up, clock running, record watched live.
      if (created?.id) {
        setWaiting(created);
        setStep("posted");
        setMode("waiting");
        toast.success("Challenge posted — waiting for an opponent.");
      } else {
        backToLobby();
        toast.success("Challenge posted — 90 seconds on the board.");
      }
    } catch {
      setPostFailed(true);
      toast.error("Couldn't post that challenge — tap retry.");
    } finally {
      postingRef.current = false;
      setBusy(false);
    }
  };

  // Instant post: the moment the hand ends it goes straight on the board and the
  // creator lands in the live waiting room — no pre-post countdown.
  const autoPostRef = useRef(postChallenge);
  autoPostRef.current = postChallenge;

  useEffect(() => {
    if (mode !== "create" || !readyToPost) return undefined;
    autoPostRef.current?.();
    return undefined;
  }, [mode, readyToPost]);

  // ── Poster's settlement transition ──────────────────────────────────
  // The live channel and the 5-second fallback poll apply the exact same
  // transition, and a per-challenge guard makes whichever arrives second a
  // no-op — a late poll can never override or double-apply a settlement.
  const handledSettleRef = useRef(new Set());

  const creatorSettled = (row) => {
    if (!row?.id || handledSettleRef.current.has(row.id)) return;
    handledSettleRef.current.add(row.id);
    setResultsFor({
      ...row,
      creator_cards: row.creator_cards?.length ? row.creator_cards : waiting?.creator_cards || [],
    });
    setWaiting(null);
    setMode("lobby");
    // Paid the instant the record settles — the poster collects nothing.
    autoCredit(row);
    loadRef.current?.();
  };

  const settledRef = useRef(creatorSettled);
  settledRef.current = creatorSettled;

  // ── Live waiting room ───────────────────────────────────────────────
  // Refund the stake the moment the window closes, then drop back to the board.
  const expireWaiting = async () => {
    const row = waiting;
    if (!row) return;
    const stake = Number(row.wager) || 0;
    const wallet = walletFieldFor(stakeTypeOf(row));
    setWaiting(null);
    backToLobby();
    try {
      // Re-read before expiring: the taker may have settled it in the final
      // second, and an expiry must never overwrite a settled record.
      const current = await base44.entities.BeatMyHandChallenge.get(row.id);
      if (!current) {
        await loadRef.current?.();
        return;
      }
      if (current.status !== "open") {
        if (current.status === "settled") settledRef.current?.(current);
        else await loadRef.current?.();
        return;
      }
      await base44.entities.BeatMyHandChallenge.update(row.id, {
        status: "expired",
        outcome: "expired",
        creator_payout: stake,
        opponent_payout: 0,
        creator_claimed: true,
        settled_at: new Date().toISOString(),
      });
      const fresh = await base44.auth.me();
      const after = (Number(fresh?.[wallet]) || 0) + stake;
      await base44.auth.updateMe({ [wallet]: after });
      if (stakeTypeOf(row) === "chips") {
        logChipMovement({
          user,
          mode: "wallet",
          action_type: "push",
          amount: stake,
          balance_after: after,
          detail: `Beat My Hand — expired challenge, ${stakeLabel(stake, "chips")} refunded`,
        });
      }
      await onUserUpdate?.();
      toast.error(`Expired — ${stakeLabel(stake, stakeTypeOf(row))} refunded.`, {
        duration: 7000,
      });
    } catch {
      toast.error("Expired — your stake is on the board to collect.", { duration: 7000 });
    }
  };

  const expireRef = useRef(expireWaiting);
  expireRef.current = expireWaiting;

  // Countdown fallback: whoever is watching the screen sees it close out.
  useEffect(() => {
    if (mode !== "waiting" || !waiting) return undefined;
    const id = setInterval(() => {
      if (secondsLeft(waiting.expires_at) > 0) return;
      clearInterval(id);
      expireRef.current?.();
    }, 500);
    return () => clearInterval(id);
  }, [mode, waiting]);

  // The record is watched live: the instant the taker settles, the poster is
  // pulled straight into the same animated showdown, no button needed.
  useEffect(() => {
    if (mode !== "waiting" || !waiting?.id) return undefined;
    const challengeId = waiting.id;
    const unsubscribe = base44.entities.BeatMyHandChallenge.subscribe((event) => {
      const row = event?.data;
      if (!row || row.id !== challengeId || row.status !== "settled") return;
      settledRef.current?.(row);
    });
    return unsubscribe;
  }, [mode, waiting]);

  // Strict 5-second fallback: the waiting room reads the challenge directly, so
  // a missed live event can never leave the poster on a stale countdown. An open
  // record keeps waiting (the countdown owns the 90-second refund), a settled
  // record opens the showdown, and an already-swept expiry leaves the room.
  useEffect(() => {
    if (mode !== "waiting" || !waiting?.id) return undefined;
    const challengeId = waiting.id;
    let active = true;
    const check = async () => {
      if (document.hidden) return;
      let row = null;
      try {
        row = await base44.entities.BeatMyHandChallenge.get(challengeId);
      } catch {
        return; // a blip simply waits for the next tick
      }
      if (!active || !row) return;
      if (row.status === "settled") {
        settledRef.current?.(row);
      } else if (row.status === "expired") {
        setWaiting(null);
        backToLobby();
        loadRef.current?.();
      }
    };
    const poll = setInterval(check, BOARD_POLL_MS);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [mode, waiting]);

  // ── Accept ──────────────────────────────────────────────────────────
  const startAccept = (challenge) => {
    if (challenge.creator_id === me) return;
    if (secondsLeft(challenge.expires_at) <= 0) {
      toast.error("That challenge has expired.");
      return;
    }
    // Never enter a challenge this wallet cannot cover — the board locks it too.
    if (!canAffordStake(user, stakeTypeOf(challenge), challenge.wager)) {
      toast.error(
        `You need ${stakeLabel(challenge.wager, stakeTypeOf(challenge))} to accept.`
      );
      return;
    }
    setTarget(challenge);
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setReadyToPost(false);
    setSettleError(null);
    setStep("wager");
    setMode("accept");
  };

  // Cards are dealt only after the matching stake is locked.
  const lockAcceptWager = () => {
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setHandKey((k) => k + 1);
    setStep("play");
  };

  // Show the result of a record that is already settled, read from its stored
  // hands — used when a retry finds its own settlement already written.
  const showSettledFrom = (row) => {
    const isMatch = formatOf(row) === "best_of_3";
    setShowdown({
      id: row.id,
      format: formatOf(row),
      creator_id: row.creator_id,
      creator_name: row.creator_name || "Player",
      creator_cards: Array.isArray(row.creator_cards) ? row.creator_cards : [],
      creator_score: Number(row.creator_score) || 0,
      creator_hands: Array.isArray(row.creator_hands) ? row.creator_hands : [],
      opponent_name: row.opponent_name || myName,
      opponent_cards: Array.isArray(row.opponent_cards) ? row.opponent_cards : [],
      opponent_hands: isMatch && Array.isArray(row.opponent_hands) ? row.opponent_hands : [],
      opponent_score: Number(row.opponent_score) || 0,
      outcome: row.outcome,
      wager: Number(row.wager) || 0,
      stake_type: stakeTypeOf(row),
      creator_payout: Number(row.creator_payout) || 0,
      opponent_payout: Number(row.opponent_payout) || 0,
      creator_claimed: !!row.creator_claimed,
      opponent_claimed: !!row.opponent_claimed,
    });
    setSettleError(null);
    setStep("showdown");
  };

  const settleAccept = async (score, cards, hands = null) => {
    if (!target || settlingRef.current) return;
    // The 90-second window closed while the hand was still being played. The
    // poster's stake has gone back to them, so nothing is owed either way.
    if (secondsLeft(target.expires_at) <= 0) {
      setSettleError(
        "The 90-second window closed before your hand finished — nothing was taken from your balance."
      );
      return;
    }
    settlingRef.current = true;
    setBusy(true);
    setSettleError(null);
    try {
      const current = await base44.entities.BeatMyHandChallenge.get(target.id);
      if (!current) {
        setSettleError("That challenge couldn't be found. Nothing was taken — go back to the Lobby.");
        return;
      }
      if (current.status !== "open") {
        // This device already settled it (a retry after a half-finished write):
        // go straight to the result it wrote instead of starting over.
        if (current.status === "settled" && current.opponent_id === me) {
          showSettledFrom(current);
          await load();
          return;
        }
        setSettleError(
          current.status === "settled"
            ? "That challenge was already settled by another player — nothing was taken from you."
            : "That challenge expired before your hand finished — nothing was taken from your balance."
        );
        return;
      }

      const stakeTypeForChallenge = stakeTypeOf(current);
      const wallet = walletFieldFor(stakeTypeForChallenge);

      // A Best of 3 compares both sides' hands by index; a standard match
      // compares the single hand exactly as before.
      const isMatch = formatOf(current) === "best_of_3" && Array.isArray(hands);
      const res = isMatch
        ? resolveMatch(current.creator_hands || [], hands, target.wager)
        : resolveHands(current.creator_score, score, target.wager);

      // 1. Write the settled result FIRST. If a wallet write then fails, the
      //    challenger is never left charged on a still-unsettled challenge.
      await base44.entities.BeatMyHandChallenge.update(target.id, {
        opponent_id: me,
        opponent_name: myName,
        ...(isMatch
          ? {
              opponent_score: Number(hands[0]?.score) || 0,
              opponent_cards: hands[0]?.cards || [],
              opponent_hands: hands,
              hand_results: res.results,
              creator_hand_wins: res.creatorHandWins,
              opponent_hand_wins: res.opponentHandWins,
            }
          : { opponent_score: score, opponent_cards: cards }),
        status: "settled",
        outcome: res.outcome,
        creator_payout: res.creatorPayout,
        opponent_payout: res.opponentPayout,
        opponent_stake_taken: false,
        opponent_claimed: false,
        creator_claimed: false,
        settled_at: new Date().toISOString(),
      });

      // 2. Match the stake once. The flag is stored on the challenge itself, so
      //    a retry — even after a refresh — can never charge it twice.
      if (!current.opponent_stake_taken) {
        const fresh = await base44.auth.me();
        const balance = Number(fresh?.[wallet]) || 0;
        if (balance < target.wager) {
          setSettleError(
            `Not enough ${stakeTypeForChallenge === "diamond" ? "Diamonds" : "chips"} to match that wager.`
          );
          return;
        }
        const afterStake = balance - target.wager;
        await base44.auth.updateMe({ [wallet]: afterStake });
        // Marked only after the wallet write actually succeeded.
        await base44.entities.BeatMyHandChallenge.update(target.id, {
          opponent_stake_taken: true,
        });
        if (stakeTypeForChallenge === "chips") {
          logChipMovement({
            user,
            mode: "wallet",
            action_type: "bet",
            amount: -target.wager,
            balance_after: afterStake,
            detail: `Beat My Hand accepted ${target.creator_name}'s ${stakeLabel(target.wager, "chips")} challenge`,
          });
        }
      }

      // The winner is paid automatically — no claim step. This device credits
      // its own side only; the poster's device credits theirs.
      autoCredit({
        id: target.id,
        status: "settled",
        outcome: res.outcome,
        stake_type: stakeTypeForChallenge,
        wager: target.wager,
        creator_id: current.creator_id,
        opponent_id: me,
        creator_payout: res.creatorPayout,
        opponent_payout: res.opponentPayout,
        creator_claimed: false,
        opponent_claimed: false,
      });

      setShowdown({
        id: target.id,
        format: isMatch ? "best_of_3" : "standard",
        creator_id: current.creator_id,
        creator_name: current.creator_name || "Player",
        creator_cards: Array.isArray(current.creator_cards) ? current.creator_cards : [],
        creator_score: Number(current.creator_score) || 0,
        creator_hands: Array.isArray(current.creator_hands) ? current.creator_hands : [],
        opponent_name: myName,
        opponent_cards: Array.isArray(cards) ? cards : [],
        opponent_hands: isMatch ? hands : [],
        opponent_score: score,
        outcome: res.outcome,
        wager: target.wager,
        stake_type: stakeTypeForChallenge,
        creator_payout: res.creatorPayout,
        opponent_payout: res.opponentPayout,
        creator_claimed: false,
        opponent_claimed: false,
      });
      setStep("showdown");
      // Refresh the balance and the board best-effort: neither may ever make a
      // completed settlement look failed.
      Promise.allSettled([Promise.resolve().then(() => onUserUpdate?.()), load()]);
    } catch (err) {
      // Never boot the challenger silently: their hand stays put and they can
      // retry in place. The real reason is shown so it is actionable.
      console.error("Beat My Hand settlement failed:", err);
      setSettleError(
        `Settlement failed: ${err?.message || "unknown error"}. Your hand is saved — tap retry.`
      );
    } finally {
      settlingRef.current = false;
      setBusy(false);
    }
  };

  // ── Collect a settled payout or an expired stake ────────────────────
  const collect = async (challenge) => {
    const amount = payoutFor(challenge);
    if (amount <= 0) return;
    setBusy(true);
    try {
      const isCreator = challenge.creator_id === me;
      await base44.entities.BeatMyHandChallenge.update(
        challenge.id,
        isCreator ? { creator_claimed: true } : { opponent_claimed: true }
      );
      const stakeTypeForChallenge = stakeTypeOf(challenge);
      const wallet = walletFieldFor(stakeTypeForChallenge);
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.[wallet]) || 0;
      const after = balance + amount;
      await base44.auth.updateMe({ [wallet]: after });
      if (stakeTypeForChallenge === "chips") {
        logChipMovement({
          user,
          mode: "wallet",
          action_type: amount > challenge.wager ? "win" : "push",
          amount,
          balance_after: after,
          detail:
            challenge.outcome === "expired"
              ? `Beat My Hand — expired challenge refunded (${stakeLabel(amount, "chips")})`
              : `Beat My Hand — ${challenge.outcome === "push" ? "push refund" : "pot won"} (${stakeLabel(amount, "chips")})`,
        });
      }
      await onUserUpdate?.();
      // Stay on the results view: only the claim flag flips, so the payout reads
      // as collected in place and the Creator can still hit Play Again.
      const claimKey = isCreator ? "creator_claimed" : "opponent_claimed";
      setResultsFor((c) =>
        c && c.id === challenge.id ? { ...c, [claimKey]: true } : c
      );
      setShowdown((s) => (s && s.id === challenge.id ? { ...s, [claimKey]: true } : s));
      toast.success(`+${stakeLabel(amount, stakeTypeForChallenge)} collected.`);
      await load();
    } catch {
      toast.error("Couldn't collect that payout.");
    } finally {
      setBusy(false);
    }
  };

  // Rematch: same wager, currency and format, no results countdown and no wager
  // screen — fresh cards are dealt straight away, and the finished hand is then
  // posted as a brand-new challenge. The old cards are never reused.
  const playAgain = (source) => {
    const sameType = stakeTypeOf(source);
    const sameWager = Number(source?.wager) || wager;
    const sameFormat = formatOf(source);
    if (!canAffordStake(user, sameType, sameWager)) {
      toast.error(
        `Not enough ${sameType === "diamond" ? "Diamonds" : "chips"} to replay that wager.`
      );
      return;
    }
    setStakeType(sameType);
    setWager(sameWager);
    setFormat(sameFormat);
    setTarget(null);
    setShowdown(null);
    setResultsFor(null);
    setFinalScore(null);
    setHandCards([]);
    setMyHands([]);
    setReadyToPost(false);
    setPostFailed(false);
    setHandKey((k) => k + 1);
    setMode("create");
    setStep("play");
  };

  return (
    <div className="relative rounded-b-2xl border border-t-0 border-border p-4" style={FELT}>
      <div
        className="pointer-events-none absolute inset-0 rounded-b-2xl"
        style={{
          boxShadow:
            "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)",
        }}
      />

      <div className="relative flex flex-col gap-3">
        {/* Balance is always visible, in every step of both flows. */}
        <ChipBalanceStrip chips={chips} diamonds={diamonds} />

        {mode === "waiting" && waiting && (
          <div className="flex flex-col gap-3">
            <button
              onClick={backToLobby}
              className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
            >
              <ArrowLeft className="w-3 h-3" /> Lobby
            </button>

            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
                Live waiting room
              </p>
              <p className="text-sm font-bold text-amber-100 mt-0.5 animate-pulse">
                Waiting for opponent to play…
              </p>
              <p className="text-3xl font-black text-amber-200 tabular-nums leading-none mt-2">
                {secondsLeft(waiting.expires_at)}s
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (secondsLeft(waiting.expires_at) / (CHALLENGE_TTL_MS / 1000)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-emerald-100/60 mt-2 tabular-nums">
                {stakeLabel(waiting.wager, stakeTypeOf(waiting))} staked ·{" "}
                {formatOf(waiting) === "best_of_3"
                  ? `best of 3 · hand 1: ${waiting.creator_score}`
                  : `hand ${waiting.creator_score}`}
              </p>
            </div>

            {formatOf(waiting) === "best_of_3" ? (
              <div className="flex flex-col gap-2">
                {(waiting.creator_hands?.length ? waiting.creator_hands : myHands).map((h, i) => (
                  <HandPanel
                    key={i}
                    title={`YOUR HAND ${i + 1}`}
                    value={Number(h?.score) || 0}
                    cards={Array.isArray(h?.cards) ? h.cards : []}
                  />
                ))}
              </div>
            ) : (
              <HandPanel
                title="YOUR POSTED HAND"
                value={Number(waiting.creator_score) || finalScore || 0}
                cards={waiting.creator_cards?.length ? waiting.creator_cards : handCards}
              />
            )}

            <p className="text-[9px] text-emerald-100/35 leading-relaxed text-center">
              Your hand is locked in. If nobody takes it within the window your stake is
              refunded automatically.
            </p>
          </div>
        )}

        {mode === "lobby" && resultsFor && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setResultsFor(null)}
              className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
            >
              <ArrowLeft className="w-3 h-3" /> Lobby
            </button>

            {formatOf(resultsFor) === "best_of_3" ? (
              <BestOfThreeShowdown
                creatorName={resultsFor.creator_name}
                creatorHands={handsOf(resultsFor, "creator")}
                opponentName={resultsFor.opponent_name}
                opponentHands={handsOf(resultsFor, "opponent")}
                outcome={resultsFor.outcome}
                payout={payoutFor(resultsFor)}
                wager={resultsFor.wager}
                stakeType={stakeTypeOf(resultsFor)}
                viewerRole={resultsFor.creator_id === me ? "creator" : "opponent"}
                onClose={() => setResultsFor(null)}
                onPlayAgain={
                  resultsFor.creator_id === me ? () => playAgain(resultsFor) : undefined
                }
                canPlayAgain={canAffordStake(
                  user,
                  stakeTypeOf(resultsFor),
                  Number(resultsFor.wager) || 0
                )}
              />
            ) : (
              <ShowdownReveal
                creatorName={resultsFor.creator_name}
                creatorCards={resultsFor.creator_cards || []}
                creatorScore={resultsFor.creator_score}
                opponentName={resultsFor.opponent_name}
                opponentCards={resultsFor.opponent_cards || []}
                opponentScore={resultsFor.opponent_score}
                outcome={resultsFor.outcome}
                payout={payoutFor(resultsFor)}
                wager={resultsFor.wager}
                stakeType={stakeTypeOf(resultsFor)}
                viewerRole={resultsFor.creator_id === me ? "creator" : "opponent"}
                onClose={() => setResultsFor(null)}
                onPlayAgain={
                  resultsFor.creator_id === me ? () => playAgain(resultsFor) : undefined
                }
                canPlayAgain={canAffordStake(
                  user,
                  stakeTypeOf(resultsFor),
                  Number(resultsFor.wager) || 0
                )}
              />
            )}
          </div>
        )}

        {mode === "lobby" && !resultsFor && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/70">
                  Beat My Hand · asynchronous · 90s window
                </p>
                <h3 className="font-display text-base font-bold text-emerald-50 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-amber-300" /> Lobby
                </h3>
              </div>
              <button
                onClick={load}
                className="p-2 rounded-full bg-white/10 border border-white/15 text-emerald-100 hover:bg-white/15 transition"
                title="Refresh lobby"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={startCreate}
              disabled={chips < WAGER_PRESETS[0] && diamonds < 1}
              className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40"
              style={{ background: "#d4af37" }}
            >
              Post a Challenge
            </button>

            {myClaims.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Ready to collect
                </p>
                {myClaims.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    me={me}
                    variant="result"
                    onCollect={collect}
                    onView={setResultsFor}
                    busy={busy}
                  />
                ))}
              </div>
            )}

            {/* Open board — the loudest thing in the tab: live bets you can take. */}
            <OpenBetsBoard
              challenges={board}
              loading={loading}
              onAccept={startAccept}
              busy={busy}
              user={user}
            />

            {myOpen.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100/50">
                  Waiting for a taker
                </p>
                {myOpen.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} me={me} variant="mine" />
                ))}
              </div>
            )}

            {/* Game Recent = the last five matches settled across all players. */}
            <GameRecentBracket me={me} onView={setResultsFor} />

            <p className="text-[9px] text-emerald-100/35 leading-relaxed mt-1">
              Highest valid hand wins the pot; a tie returns both stakes, and if both bust the
              house keeps them. Best of 3 goes to the most hand wins — equal hand wins refund
              both stakes. Unaccepted challenges refund automatically after 90 seconds.
            </p>
          </div>
        )}

        {mode === "create" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={backToLobby}
              className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
            >
              <ArrowLeft className="w-3 h-3" /> Lobby
            </button>

            {step === "wager" ? (
              <>
                <FormatToggle value={format} onChange={setFormat} />
                <WagerLockCard
                  wager={wager}
                  stakeType={stakeType}
                  chips={chips}
                  diamonds={diamonds}
                  onChange={(amount, type) => {
                    setWager(amount);
                    setStakeType(type);
                  }}
                  onLock={lockCreateWager}
                  hint="Pick your stake and lock it in. Your cards are dealt only after the wager is locked."
                />
              </>
            ) : (
              <>
                <WagerLockCard
                  wager={wager}
                  stakeType={stakeType}
                  chips={chips}
                  diamonds={diamonds}
                  locked
                />

                {format === "best_of_3" ? (
                  <BestOfThreePlay
                    key={handKey}
                    timeLimit={TURN_SECONDS}
                    disabled={readyToPost}
                    onMatchDone={matchDone}
                  />
                ) : (
                  <LocalHand
                    key={handKey}
                    onHandDone={handDone}
                    disabled={readyToPost}
                  />
                )}

                {readyToPost && !postFailed && (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
                      Posting to the board…
                    </p>
                    <p className="text-[10px] text-emerald-100/60 mt-1 tabular-nums">
                      {format === "best_of_3"
                        ? `Best of 3 · ${myHands.map((h) => h.score).join(" / ")}`
                        : `Hand ${finalScore}`}
                      {" · "}
                      {stakeLabel(wager, stakeType)}
                    </p>
                  </div>
                )}

                {readyToPost && postFailed && (
                  <button
                    onClick={postChallenge}
                    disabled={busy}
                    className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40"
                    style={{ background: "#d4af37" }}
                  >
                    {busy
                      ? "Posting…"
                      : format === "best_of_3"
                        ? `Retry post · Best of 3 for ${stakeLabel(wager, stakeType)}`
                        : `Retry post · ${finalScore} for ${stakeLabel(wager, stakeType)}`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {mode === "accept" && target && (
          <div className="flex flex-col gap-3">
            {step !== "showdown" && (
              <button
                onClick={backToLobby}
                className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
              >
                <ArrowLeft className="w-3 h-3" /> Lobby
              </button>
            )}

            <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
                Beating {target.creator_name || "Player"} ·{" "}
                {stakeLabel(target.wager, stakeTypeOf(target))}
              </p>
              <p className="text-[10px] text-emerald-100/50 mt-0.5">
                {step === "showdown"
                  ? "Your hands are revealed below."
                  : formatOf(target) === "best_of_3"
                    ? "3 hands each — theirs stay locked until you finish all three."
                    : "Their hand stays locked until you finish yours."}
              </p>
            </div>

            {step === "wager" && (
              <WagerLockCard
                wager={target.wager}
                stakeType={stakeTypeOf(target)}
                chips={chips}
                diamonds={diamonds}
                fixed
                onLock={lockAcceptWager}
                lockLabel={`Lock in ${stakeLabel(target.wager, stakeTypeOf(target))}`}
                hint="Matching the stake locks your wager. Your cards are dealt right after."
              />
            )}

            {step === "play" && (
              <>
                {formatOf(target) === "best_of_3" ? (
                  <BestOfThreePlay
                    key={handKey}
                    timeLimit={TURN_SECONDS}
                    disabled={busy}
                    onMatchDone={(hands) => {
                      setMyHands(hands);
                      const first = hands[0] || { score: 0, cards: [] };
                      settleAccept(Number(first.score) || 0, first.cards || [], hands);
                    }}
                  />
                ) : (
                  <LocalHand
                    key={handKey}
                    timeLimit={TURN_SECONDS}
                    onHandDone={(score, cards) => {
                      setFinalScore(score);
                      setHandCards(Array.isArray(cards) ? cards : []);
                      settleAccept(score, Array.isArray(cards) ? cards : []);
                    }}
                    disabled={finalScore != null}
                  />
                )}
                {busy && (
                  <p className="text-center text-[11px] font-bold uppercase tracking-widest text-amber-200 animate-pulse">
                    Settling the pot…
                  </p>
                )}

                {settleError && !busy && (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
                      Settlement failed
                    </p>
                    <p className="text-[11px] text-rose-100/80 mt-1 leading-snug">{settleError}</p>
                    <button
                      onClick={() => {
                        const isMatch = formatOf(target) === "best_of_3";
                        const first = isMatch ? myHands[0] || { score: 0, cards: [] } : null;
                        settleAccept(
                          isMatch ? Number(first.score) || 0 : Number(finalScore) || 0,
                          isMatch ? first.cards || [] : handCards,
                          isMatch ? myHands : null
                        );
                      }}
                      disabled={busy}
                      className="mt-2 w-full py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-emerald-950 disabled:opacity-40"
                      style={{ background: "#d4af37" }}
                    >
                      Retry settlement
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "showdown" && showdown && formatOf(showdown) === "best_of_3" && (
              <BestOfThreeShowdown
                creatorName={showdown.creator_name}
                creatorHands={showdown.creator_hands || []}
                opponentName={showdown.opponent_name}
                opponentHands={showdown.opponent_hands || []}
                outcome={showdown.outcome}
                payout={payoutFor(showdown)}
                wager={showdown.wager}
                stakeType={stakeTypeOf(showdown)}
                viewerRole="opponent"
                footer={
                  <ChallengerResultSwap
                    outcome={showdown.outcome}
                    wager={showdown.wager}
                    stakeType={stakeTypeOf(showdown)}
                    payout={payoutFor(showdown)}
                    challenges={board}
                    loading={loading}
                    onAccept={startAccept}
                    busy={busy}
                    user={user}
                  />
                }
                onClose={backToLobby}
              />
            )}

            {step === "showdown" && showdown && formatOf(showdown) !== "best_of_3" && (
              <ShowdownReveal
                creatorName={showdown.creator_name}
                creatorCards={showdown.creator_cards || []}
                creatorScore={showdown.creator_score}
                opponentName={showdown.opponent_name}
                opponentCards={showdown.opponent_cards || []}
                opponentScore={showdown.opponent_score}
                outcome={showdown.outcome}
                payout={payoutFor(showdown)}
                wager={showdown.wager}
                stakeType={stakeTypeOf(showdown)}
                viewerRole="opponent"
                footer={
                  <ChallengerResultSwap
                    outcome={showdown.outcome}
                    wager={showdown.wager}
                    stakeType={stakeTypeOf(showdown)}
                    payout={payoutFor(showdown)}
                    challenges={board}
                    loading={loading}
                    onAccept={startAccept}
                    busy={busy}
                    user={user}
                  />
                }
                onClose={backToLobby}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}