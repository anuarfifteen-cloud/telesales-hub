import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Swords } from "lucide-react";
import { motion } from "framer-motion";
import LocalHand from "./LocalHand";
import HandPanel from "../HandPanel";
import ChallengeCard from "./ChallengeCard";
import ChipBalanceStrip from "./ChipBalanceStrip";
import WagerLockCard from "./WagerLockCard";
import ShowdownReveal from "./ShowdownReveal";
import { logChipMovement } from "@/lib/chipLog";
import {
  AUTO_POST_SECONDS,
  CHALLENGE_TTL_MS,
  TURN_SECONDS,
  WAGER_PRESETS,
  isExpired,
  resolveHands,
  secondsLeft,
} from "@/lib/beatMyHand";

const FELT = {
  background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
};

export default function BeatMyHandView({ user, onUserUpdate }) {
  const me = user?.id;
  const myName = user?.full_name || user?.email?.split("@")[0] || "Player";
  const chips = Number(user?.casinoChips) || 0;

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("lobby"); // lobby | create | accept
  const [step, setStep] = useState("wager"); // wager | play | showdown
  const [wager, setWager] = useState(WAGER_PRESETS[0]);
  const [finalScore, setFinalScore] = useState(null);
  const [handCards, setHandCards] = useState([]);
  const [target, setTarget] = useState(null);
  const [showdown, setShowdown] = useState(null);
  // A finished challenge opened from the board or Recent — replays the showdown.
  const [resultsFor, setResultsFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [handKey, setHandKey] = useState(0);
  const [postCountdown, setPostCountdown] = useState(null);
  const [postFailed, setPostFailed] = useState(false);
  // The posted challenge the creator is sitting on in the live waiting room.
  const [waiting, setWaiting] = useState(null);
  const [, setTick] = useState(0);
  // The challenger's hand can only be settled once, whichever path ended it.
  const settlingRef = useRef(false);
  // A finished hand can only be posted once, auto or manual.
  const postingRef = useRef(false);

  // Live countdown on the board.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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

  const load = useCallback(async () => {
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
      const byId = new Map();
      [...(openRes?.items || []), ...(mineRes?.items || [])].forEach((c) =>
        byId.set(c.id, c)
      );
      const rows = await sweepExpired([...byId.values()]);
      rows.sort((a, b) =>
        String(b.created_date || "").localeCompare(String(a.created_date || ""))
      );
      setChallenges(rows);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

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
  const myResults = myRows.filter(
    (c) => c.status !== "open" && !(payoutFor(c) > 0 && !claimedFor(c))
  );

  const backToLobby = () => {
    setMode("lobby");
    setStep("wager");
    setTarget(null);
    setFinalScore(null);
    setHandCards([]);
    setShowdown(null);
    setWaiting(null);
  };

  // ── Create ──────────────────────────────────────────────────────────
  const startCreate = () => {
    setFinalScore(null);
    setHandCards([]);
    setPostFailed(false);
    setPostCountdown(null);
    setStep("wager");
    setMode("create");
  };

  // Cards are dealt only after the wager is locked.
  const lockCreateWager = () => {
    setFinalScore(null);
    setHandCards([]);
    setPostFailed(false);
    setPostCountdown(null);
    setHandKey((k) => k + 1);
    setStep("play");
  };

  const handDone = useCallback((score, cards) => {
    setFinalScore(score);
    setHandCards(Array.isArray(cards) ? cards : []);
  }, []);

  const postChallenge = async () => {
    if (finalScore == null || postingRef.current) return;
    postingRef.current = true;
    setBusy(true);
    setPostFailed(false);
    try {
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < wager) {
        toast.error("Not enough chips for that wager.");
        backToLobby();
        return;
      }
      const after = balance - wager;
      await base44.auth.updateMe({ casinoChips: after });
      const created = await base44.entities.BeatMyHandChallenge.create({
        creator_id: me,
        creator_name: myName,
        creator_score: finalScore,
        creator_cards: handCards,
        wager,
        status: "open",
        expires_at: Date.now() + CHALLENGE_TTL_MS,
        creator_payout: 0,
        opponent_payout: 0,
        creator_claimed: false,
        opponent_claimed: false,
      });
      logChipMovement({
        user,
        mode: "wallet",
        action_type: "bet",
        amount: -wager,
        balance_after: after,
        detail: `Beat My Hand challenge posted — ${wager} chips (hand ${finalScore})`,
      });
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

  // Auto-post: the moment the hand ends, count three seconds and submit it.
  const autoPostRef = useRef(postChallenge);
  autoPostRef.current = postChallenge;

  useEffect(() => {
    if (mode !== "create" || finalScore == null) return undefined;
    const startedAt = Date.now();
    setPostCountdown(AUTO_POST_SECONDS);
    const id = setInterval(() => {
      const left = AUTO_POST_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(id);
        setPostCountdown(0);
        autoPostRef.current?.();
      } else {
        setPostCountdown(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [mode, finalScore]);

  // ── Live waiting room ───────────────────────────────────────────────
  // Refund the stake the moment the window closes, then drop back to the board.
  const expireWaiting = async () => {
    const row = waiting;
    if (!row) return;
    const stake = Number(row.wager) || 0;
    setWaiting(null);
    backToLobby();
    try {
      await base44.entities.BeatMyHandChallenge.update(row.id, {
        status: "expired",
        outcome: "expired",
        creator_payout: stake,
        opponent_payout: 0,
        creator_claimed: true,
        settled_at: new Date().toISOString(),
      });
      const fresh = await base44.auth.me();
      const after = (Number(fresh?.casinoChips) || 0) + stake;
      await base44.auth.updateMe({ casinoChips: after });
      logChipMovement({
        user,
        mode: "wallet",
        action_type: "push",
        amount: stake,
        balance_after: after,
        detail: `Beat My Hand — expired challenge, ${stake} chips refunded`,
      });
      await onUserUpdate?.();
      toast.error(`Expired — ${stake} chips refunded.`, { duration: 7000 });
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
    const unsubscribe = base44.entities.BeatMyHandChallenge.subscribe((event) => {
      const row = event?.data;
      if (!row || row.id !== waiting.id || row.status !== "settled") return;
      setResultsFor({
        ...row,
        creator_cards: row.creator_cards?.length ? row.creator_cards : waiting.creator_cards,
      });
      setWaiting(null);
      setMode("lobby");
      load();
    });
    return unsubscribe;
  }, [mode, waiting, load]);

  // ── Accept ──────────────────────────────────────────────────────────
  const startAccept = (challenge) => {
    if (challenge.creator_id === me) return;
    if (secondsLeft(challenge.expires_at) <= 0) {
      toast.error("That challenge has expired.");
      return;
    }
    setTarget(challenge);
    setFinalScore(null);
    setHandCards([]);
    setStep("wager");
    setMode("accept");
  };

  // Cards are dealt only after the matching stake is locked.
  const lockAcceptWager = () => {
    setFinalScore(null);
    setHandCards([]);
    setHandKey((k) => k + 1);
    setStep("play");
  };

  const settleAccept = async (score, cards) => {
    if (!target || settlingRef.current) return;
    if (secondsLeft(target.expires_at) <= 0) {
      toast.error("That challenge has expired.");
      backToLobby();
      await load();
      return;
    }
    settlingRef.current = true;
    setBusy(true);
    try {
      const live = await base44.entities.BeatMyHandChallenge.filter({ id: target.id });
      const current = Array.isArray(live) ? live[0] : live?.items?.[0];
      if (!current || current.status !== "open") {
        toast.error("That challenge is no longer open.");
        backToLobby();
        return;
      }

      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < target.wager) {
        toast.error("Not enough chips to match that wager.");
        backToLobby();
        return;
      }

      // Match the stake.
      const afterStake = balance - target.wager;
      await base44.auth.updateMe({ casinoChips: afterStake });
      logChipMovement({
        user,
        mode: "wallet",
        action_type: "bet",
        amount: -target.wager,
        balance_after: afterStake,
        detail: `Beat My Hand accepted ${target.creator_name}'s ${target.wager}-chip challenge`,
      });

      const res = resolveHands(current.creator_score, score, target.wager);

      // Record the settlement before touching the payout, so a failure can
      // never pay the same result twice.
      await base44.entities.BeatMyHandChallenge.update(target.id, {
        opponent_id: me,
        opponent_name: myName,
        opponent_score: score,
        opponent_cards: cards,
        status: "settled",
        outcome: res.outcome,
        creator_payout: res.creatorPayout,
        opponent_payout: res.opponentPayout,
        opponent_claimed: true,
        creator_claimed: false,
        settled_at: new Date().toISOString(),
      });

      if (res.opponentPayout > 0) {
        const afterPayout = afterStake + res.opponentPayout;
        await base44.auth.updateMe({ casinoChips: afterPayout });
        logChipMovement({
          user,
          mode: "wallet",
          action_type: res.outcome === "push" ? "push" : "win",
          amount: res.opponentPayout,
          balance_after: afterPayout,
          detail: `Beat My Hand — ${res.detail}`,
        });
      }

      setShowdown({
        creatorName: current.creator_name || "Player",
        creatorCards: Array.isArray(current.creator_cards) ? current.creator_cards : [],
        creatorScore: Number(current.creator_score) || 0,
        opponentCards: Array.isArray(cards) ? cards : [],
        opponentScore: score,
        outcome: res.outcome,
        payout: res.opponentPayout,
        wager: target.wager,
      });
      setStep("showdown");
      await onUserUpdate?.();
      await load();
    } catch {
      toast.error("Couldn't settle that challenge.");
      backToLobby();
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
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      const after = balance + amount;
      await base44.auth.updateMe({ casinoChips: after });
      logChipMovement({
        user,
        mode: "wallet",
        action_type: amount > challenge.wager ? "win" : "push",
        amount,
        balance_after: after,
        detail:
          challenge.outcome === "expired"
            ? `Beat My Hand — expired challenge refunded (${amount} chips)`
            : `Beat My Hand — ${challenge.outcome === "push" ? "push refund" : "pot won"} (${amount} chips)`,
      });
      await onUserUpdate?.();
      setResultsFor(null);
      toast.success(`+${amount} chips collected.`);
      await load();
    } catch {
      toast.error("Couldn't collect that payout.");
    } finally {
      setBusy(false);
    }
  };

  // Replay at the same stake: skips wager selection and deals straight away.
  const playAgain = () => {
    const sameWager = Number(showdown?.wager) || wager;
    if (chips < sameWager) {
      toast.error("Not enough chips to replay that wager.");
      return;
    }
    setWager(sameWager);
    setTarget(null);
    setShowdown(null);
    setFinalScore(null);
    setHandCards([]);
    setPostFailed(false);
    setPostCountdown(null);
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
        <ChipBalanceStrip chips={chips} />

        {mode === "waiting" && waiting && (
          <div className="flex flex-col gap-3">
            <button
              onClick={backToLobby}
              className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
            >
              <ArrowLeft className="w-3 h-3" /> Board
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
                {waiting.wager} chips staked · hand {waiting.creator_score}
              </p>
            </div>

            <HandPanel
              title="YOUR POSTED HAND"
              value={Number(waiting.creator_score) || finalScore || 0}
              cards={waiting.creator_cards?.length ? waiting.creator_cards : handCards}
            />

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
              <ArrowLeft className="w-3 h-3" /> Board
            </button>

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
              viewerRole={resultsFor.creator_id === me ? "creator" : "opponent"}
              onCollect={
                payoutFor(resultsFor) > 0 && !claimedFor(resultsFor)
                  ? () => collect(resultsFor)
                  : undefined
              }
              collectLabel={`Collect ${payoutFor(resultsFor)} chips`}
              collecting={busy}
              onClose={() => setResultsFor(null)}
            />
          </div>
        )}

        {mode === "lobby" && !resultsFor && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/70">
                  Asynchronous · 90s window
                </p>
                <h3 className="font-display text-base font-bold text-emerald-50 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-amber-300" /> Beat My Hand
                </h3>
              </div>
              <button
                onClick={load}
                className="p-2 rounded-full bg-white/10 border border-white/15 text-emerald-100 hover:bg-white/15 transition"
                title="Refresh board"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={startCreate}
              disabled={chips < WAGER_PRESETS[0]}
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

            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100/50">
                Open board
              </p>
              {loading ? (
                <p className="text-xs text-emerald-100/50 py-4 text-center">Loading the board…</p>
              ) : board.length === 0 ? (
                <p className="text-xs text-emerald-100/40 py-4 text-center">
                  No open challenges right now — post one and wait for a taker.
                </p>
              ) : (
                board.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    me={me}
                    variant="board"
                    onAccept={startAccept}
                    busy={busy}
                  />
                ))
              )}
            </div>

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

            {myResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100/50">
                  Recent
                </p>
                {myResults.slice(0, 6).map((c) => (
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

            <p className="text-[9px] text-emerald-100/35 leading-relaxed mt-1">
              Highest valid hand wins the pot. A tie returns both stakes; if both bust the
              house keeps them. Unaccepted challenges refund automatically after 90 seconds.
            </p>
          </div>
        )}

        {mode === "create" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={backToLobby}
              className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
            >
              <ArrowLeft className="w-3 h-3" /> Board
            </button>

            {step === "wager" ? (
              <WagerLockCard
                wager={wager}
                chips={chips}
                onChange={setWager}
                onLock={lockCreateWager}
                hint="Pick your stake and lock it in. Your cards are dealt only after the wager is locked."
              />
            ) : (
              <>
                <WagerLockCard wager={wager} chips={chips} locked />

                <LocalHand
                  key={handKey}
                  onHandDone={handDone}
                  disabled={finalScore != null}
                />

                {finalScore != null && !postFailed && (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
                      {busy ? "Posting challenge…" : "Posting automatically"}
                    </p>
                    <p className="text-3xl font-black text-amber-200 tabular-nums leading-none mt-1">
                      {postCountdown ?? AUTO_POST_SECONDS}
                    </p>
                    <p className="text-[10px] text-emerald-100/60 mt-1 tabular-nums">
                      Hand {finalScore} · {wager} chips
                    </p>
                  </div>
                )}

                {finalScore != null && postFailed && (
                  <button
                    onClick={postChallenge}
                    disabled={busy}
                    className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40"
                    style={{ background: "#d4af37" }}
                  >
                    {busy ? "Posting…" : `Retry post · ${finalScore} for ${wager} chips`}
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
                <ArrowLeft className="w-3 h-3" /> Board
              </button>
            )}

            <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
                Beating {target.creator_name || "Player"} · {target.wager} chips
              </p>
              <p className="text-[10px] text-emerald-100/50 mt-0.5">
                {step === "showdown"
                  ? "Your hands are revealed below."
                  : "Their hand stays locked until you finish yours."}
              </p>
            </div>

            {step === "wager" && (
              <WagerLockCard
                wager={target.wager}
                chips={chips}
                fixed
                onLock={lockAcceptWager}
                lockLabel={`Lock in ${target.wager} chips`}
                hint="Matching the stake locks your wager. Your cards are dealt right after."
              />
            )}

            {step === "play" && (
              <>
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
                {busy && (
                  <p className="text-center text-[11px] font-bold uppercase tracking-widest text-amber-200 animate-pulse">
                    Settling the pot…
                  </p>
                )}
              </>
            )}

            {step === "showdown" && showdown && (
              <ShowdownReveal
                {...showdown}
                onClose={backToLobby}
                onPlayAgain={playAgain}
                canPlayAgain={chips >= (Number(showdown.wager) || 0)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}