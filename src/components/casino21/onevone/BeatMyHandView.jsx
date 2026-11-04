import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Swords } from "lucide-react";
import { motion } from "framer-motion";
import LocalHand from "./LocalHand";
import ChallengeCard from "./ChallengeCard";
import WagerPresets from "./WagerPresets";
import MiniChipIcon from "../MiniChipIcon";
import { logChipMovement } from "@/lib/chipLog";
import {
  CHALLENGE_TTL_MS,
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
  const [wager, setWager] = useState(WAGER_PRESETS[0]);
  const [finalScore, setFinalScore] = useState(null);
  const [target, setTarget] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [handKey, setHandKey] = useState(0);
  const [, setTick] = useState(0);

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

  const nameOf = (c, creator) => (creator ? c.creator_name : c.opponent_name) || "Player";
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

  // ── Create ──────────────────────────────────────────────────────────
  const startCreate = () => {
    setFinalScore(null);
    setHandKey((k) => k + 1);
    setMode("create");
  };

  const postChallenge = async () => {
    if (finalScore == null) return;
    setBusy(true);
    try {
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < wager) {
        toast.error("Not enough chips for that wager.");
        return;
      }
      const after = balance - wager;
      await base44.auth.updateMe({ casinoChips: after });
      await base44.entities.BeatMyHandChallenge.create({
        creator_id: me,
        creator_name: myName,
        creator_score: finalScore,
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
      setMode("lobby");
      setFinalScore(null);
      toast.success("Challenge posted — 90 seconds on the board.");
      await load();
    } catch {
      toast.error("Couldn't post that challenge.");
    } finally {
      setBusy(false);
    }
  };

  // ── Accept ──────────────────────────────────────────────────────────
  const startAccept = (challenge) => {
    if (challenge.creator_id === me) return;
    if (secondsLeft(challenge.expires_at) <= 0) {
      toast.error("That challenge has expired.");
      return;
    }
    setTarget(challenge);
    setFinalScore(null);
    setHandKey((k) => k + 1);
    setMode("accept");
  };

  const settleAccept = async () => {
    if (finalScore == null || !target) return;
    setBusy(true);
    try {
      const live = await base44.entities.BeatMyHandChallenge.filter({ id: target.id });
      const current = Array.isArray(live) ? live[0] : live?.items?.[0];
      if (!current || current.status !== "open") {
        toast.error("That challenge is no longer open.");
        setMode("lobby");
        setTarget(null);
        return;
      }

      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < target.wager) {
        toast.error("Not enough chips to match that wager.");
        setMode("lobby");
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

      const res = resolveHands(current.creator_score, finalScore, target.wager);

      // Record the settlement before touching the payout, so a failure can
      // never pay the same result twice.
      await base44.entities.BeatMyHandChallenge.update(target.id, {
        opponent_id: me,
        opponent_name: myName,
        opponent_score: finalScore,
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

      setResult({
        myScore: finalScore,
        theirScore: current.creator_score,
        outcome: res.outcome,
        detail: res.detail,
        payout: res.opponentPayout,
      });
      await onUserUpdate?.();
      setMode("lobby");
      setTarget(null);
      setFinalScore(null);
      await load();
    } catch {
      toast.error("Couldn't settle that challenge.");
    } finally {
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
      toast.success(`+${amount} chips collected.`);
      await load();
    } catch {
      toast.error("Couldn't collect that payout.");
    } finally {
      setBusy(false);
    }
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

      {mode === "lobby" && (
        <div className="relative flex flex-col gap-3">
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

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                You {result.myScore} · {result.theirScore} Challenger
              </p>
              <p className="text-xs font-semibold text-emerald-50 mt-1">{result.detail}</p>
              <button
                onClick={() => setResult(null)}
                className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
              >
                Dismiss
              </button>
            </motion.div>
          )}

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
        <div className="relative flex flex-col gap-3">
          <button
            onClick={() => setMode("lobby")}
            className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
          >
            <ArrowLeft className="w-3 h-3" /> Board
          </button>

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/70">
              Play your hand, then post it
            </p>
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-200">
              <MiniChipIcon size={12} /> {chips}
            </span>
          </div>

          <WagerPresets
            value={wager}
            onChange={setWager}
            chips={chips}
            disabled={finalScore != null}
          />

          <LocalHand key={handKey} onHandDone={setFinalScore} disabled={finalScore != null} />

          {finalScore != null && (
            <button
              onClick={postChallenge}
              disabled={busy}
              className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40"
              style={{ background: "#d4af37" }}
            >
              {busy ? "Posting…" : `Post ${finalScore} for ${wager} chips`}
            </button>
          )}
        </div>
      )}

      {mode === "accept" && target && (
        <div className="relative flex flex-col gap-3">
          <button
            onClick={() => {
              setMode("lobby");
              setTarget(null);
              setFinalScore(null);
            }}
            className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60 hover:text-emerald-100"
          >
            <ArrowLeft className="w-3 h-3" /> Board
          </button>

          <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
              Beating {target.creator_name || "Player"} · {target.wager} chips
            </p>
            <p className="text-[10px] text-emerald-100/50 mt-0.5">
              Their hand stays locked until you finish yours.
            </p>
          </div>

          <LocalHand key={handKey} onHandDone={setFinalScore} disabled={finalScore != null} />

          {finalScore != null && (
            <button
              onClick={settleAccept}
              disabled={busy}
              className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40"
              style={{ background: "#d4af37" }}
            >
              {busy ? "Settling…" : `Reveal & Settle at ${finalScore}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}