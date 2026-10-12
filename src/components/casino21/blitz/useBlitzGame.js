import { useState, useEffect, useRef, useCallback } from "react";
import {
  createDeck,
  shuffle,
  handValue,
  isBlackjack,
  isBust,
} from "../blackjackDeck";
import {
  BLITZ_START_CHIPS,
  BLITZ_WAGER,
  BLITZ_DURATION_MS,
  DEALER_DRAW_MS,
  blitzDealerShouldHit,
  settleBlitzHand,
} from "./blitzEngine";

// Local blackjack game hook for the Blitz tournament. Each player runs this
// independently on their own device — there is no shared deck or shared dealer.
// The hook manages the player's temporary Blitz Chip balance, their hand, their
// local dealer's hand, and the per-hand deal/hit/stand/double-down flow.
//
// When the tournament timer expires, controls lock and any in-progress hand
// auto-stands and settles into the final Blitz chip score.
export default function useBlitzGame({ active, blitzEndsAt, onSubmitScore }) {
  const [blitzChips, setBlitzChips] = useState(BLITZ_START_CHIPS);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [wager, setWager] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | playing | dealer | settled
  const [canDouble, setCanDouble] = useState(false);
  const [result, setResult] = useState(null);
  const [locked, setLocked] = useState(false);
  const [dealerThinking, setDealerThinking] = useState(false);
  const [revealHole, setRevealHole] = useState(false);

  const eliminated = blitzChips <= 0;

  // Refs for accessing current values inside async callbacks and intervals.
  const stateRef = useRef({});
  stateRef.current = { phase, locked, blitzChips, wager, playerHand, dealerHand };
  const finishingRef = useRef(false);
  const submitScoreRef = useRef(onSubmitScore);
  submitScoreRef.current = onSubmitScore;

  // Reset local state when the tournament starts.
  useEffect(() => {
    if (active && blitzEndsAt) {
      setBlitzChips(BLITZ_START_CHIPS);
      setPlayerHand([]);
      setDealerHand([]);
      setWager(0);
      setPhase("idle");
      setCanDouble(false);
      setResult(null);
      setLocked(false);
      setDealerThinking(false);
      setRevealHole(false);
      finishingRef.current = false;
    } else if (!active) {
      setPlayerHand([]);
      setDealerHand([]);
      setWager(0);
      setPhase("idle");
      setCanDouble(false);
      setResult(null);
      setLocked(false);
      setDealerThinking(false);
      setRevealHole(false);
      finishingRef.current = false;
    }
  }, [active, blitzEndsAt]);

  // Submit score to the shared table whenever chips change during active play.
  useEffect(() => {
    if (active) submitScoreRef.current(blitzChips);
  }, [blitzChips, active]);

  // Timer expiry: lock controls and auto-stand any in-progress hand.
  useEffect(() => {
    if (!active || !blitzEndsAt) return;
    const check = () => {
      if (Date.now() >= blitzEndsAt) {
        setLocked(true);
        if (stateRef.current.phase === "playing" && !finishingRef.current) {
          doStand(true);
        }
      }
    };
    check();
    const iv = setInterval(check, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, blitzEndsAt]);

  // ── Settle a hand and update the Blitz chip balance ──────────────
  const doSettle = useCallback((p, dl, bet) => {
    const outcome = settleBlitzHand(p, dl, bet);
    setBlitzChips((c) => c + outcome.return);
    setResult({ ...outcome, wager: bet });
    setPhase("settled");
    setRevealHole(true);
    finishingRef.current = false;
  }, []);

  // ── Finish the dealer's hand, then settle ────────────────────────
  const doFinishDealer = useCallback(
    async (startDeck, startDealer, p, bet) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setPhase("dealer");
      setCanDouble(false);
      setRevealHole(true);

      const pNatural = isBlackjack(p);
      const dNatural = isBlackjack(startDealer);

      // Naturals: no dealer draw needed.
      if (pNatural || dNatural) {
        doSettle(p, startDealer, bet);
        return;
      }

      let d = [...startDeck];
      let dl = [...startDealer];
      while (blitzDealerShouldHit(dl)) {
        setDealerThinking(true);
        await new Promise((r) => setTimeout(r, DEALER_DRAW_MS));
        setDealerThinking(false);
        dl = [...dl, d.pop()];
        setDealerHand([...dl]);
      }
      doSettle(p, dl, bet);
    },
    [doSettle]
  );

  // ── Deal a new hand ───────────────────────────────────────────────
  const dealHand = useCallback(() => {
    if (locked || eliminated) return;
    if (stateRef.current.phase === "playing" || stateRef.current.phase === "dealer")
      return;

    const balance = stateRef.current.blitzChips;
    const bet = Math.min(BLITZ_WAGER, balance);
    if (bet <= 0) return;

    setBlitzChips((c) => c - bet);
    setWager(bet);
    setResult(null);
    setRevealHole(false);
    setPhase("playing");

    const d = shuffle(createDeck());
    const p = [d.pop(), d.pop()];
    const dl = [d.pop(), d.pop()];
    setPlayerHand(p);
    setDealerHand(dl);

    // Can double down if any chips remain after the wager.
    setCanDouble(balance - bet > 0);

    // Naturals: settle immediately.
    const pNatural = isBlackjack(p);
    const dNatural = isBlackjack(dl);
    if (pNatural || dNatural) {
      doFinishDealer(d, dl, p, bet);
    }
  }, [locked, eliminated, doFinishDealer]);

  // ── Hit ───────────────────────────────────────────────────────────
  const hit = useCallback(() => {
    if (locked || stateRef.current.phase !== "playing") return;
    setCanDouble(false);
    // Read current hands from state refs.
    const deck = [];
    const p = [...stateRef.current.playerHand];
    const dl = [...stateRef.current.dealerHand];
    const bet = stateRef.current.wager;
    // We need the deck — reconstruct from a fresh shuffle since deck isn't
    // stored in state (it's throwaway per hand). Actually we DO need to track
    // the deck. Let me store it in a ref.
    const d = deckRef.current;
    if (!d || !d.length) return;
    const card = d.pop();
    const newP = [...p, card];
    setPlayerHand(newP);
    deckRef.current = [...d];

    const v = handValue(newP);
    if (v > 21) {
      // Bust — settle without dealer draw.
      finishingRef.current = true;
      doSettle(newP, dl, bet);
    } else if (v === 21) {
      // Auto-stand on 21.
      doFinishDealer([...d], dl, newP, bet);
    }
  }, [locked, doSettle, doFinishDealer]);

  // ── Stand ─────────────────────────────────────────────────────────
  const doStand = useCallback(
    (auto = false) => {
      if (finishingRef.current) return;
      if (!auto && (locked || stateRef.current.phase !== "playing")) return;
      if (auto && stateRef.current.phase !== "playing") return;
      const d = [...deckRef.current];
      const dl = [...stateRef.current.dealerHand];
      const p = [...stateRef.current.playerHand];
      const bet = stateRef.current.wager;
      doFinishDealer(d, dl, p, bet);
    },
    [locked, doFinishDealer]
  );

  // ── Double Down ──────────────────────────────────────────────────
  const doubleDown = useCallback(() => {
    if (locked || stateRef.current.phase !== "playing" || !canDouble) return;
    const balance = stateRef.current.blitzChips;
    const originalWager = stateRef.current.wager;
    const extra = Math.min(originalWager, balance);
    if (extra <= 0) return;

    setBlitzChips((c) => c - extra);
    const totalWager = originalWager + extra;
    setWager(totalWager);
    setCanDouble(false);

    const d = [...deckRef.current];
    const p = [...stateRef.current.playerHand];
    const dl = [...stateRef.current.dealerHand];
    const newP = [...p, d.pop()];
    setPlayerHand(newP);
    deckRef.current = [...d];

    const v = handValue(newP);
    if (v > 21) {
      finishingRef.current = true;
      doSettle(newP, dl, totalWager);
    } else {
      doFinishDealer([...d], dl, newP, totalWager);
    }
  }, [locked, canDouble, doSettle, doFinishDealer]);

  // Deck ref — persists across renders within a hand, reset on each deal.
  const deckRef = useRef([]);

  // Override dealHand to also set the deck ref.
  const dealHandWithDeck = useCallback(() => {
    if (locked || eliminated) return;
    if (stateRef.current.phase === "playing" || stateRef.current.phase === "dealer")
      return;

    const balance = stateRef.current.blitzChips;
    const bet = Math.min(BLITZ_WAGER, balance);
    if (bet <= 0) return;

    setBlitzChips((c) => c - bet);
    setWager(bet);
    setResult(null);
    setRevealHole(false);
    setPhase("playing");

    const d = shuffle(createDeck());
    const p = [d.pop(), d.pop()];
    const dl = [d.pop(), d.pop()];
    deckRef.current = [...d];
    setPlayerHand(p);
    setDealerHand(dl);
    setCanDouble(balance - bet > 0);

    const pNatural = isBlackjack(p);
    const dNatural = isBlackjack(dl);
    if (pNatural || dNatural) {
      doFinishDealer(d, dl, p, bet);
    }
  }, [locked, eliminated, doFinishDealer]);

  return {
    blitzChips,
    playerHand,
    dealerHand,
    wager,
    phase,
    canDouble,
    result,
    locked,
    eliminated,
    dealerThinking,
    revealHole,
    dealHand: dealHandWithDeck,
    hit,
    stand: () => doStand(false),
    doubleDown,
  };
}