import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Users,
  Coins,
  LogOut,
  Radio,
  WifiOff,
  RotateCcw,
  Zap,
  Crown,
  Play,
} from "lucide-react";
import { logChipMovement } from "@/lib/chipLog";
import MiniChipIcon from "../MiniChipIcon";
import useBlitzTable from "./useBlitzTable";
import useBlitzHostEngine from "./useBlitzHostEngine";
import useBlitzGame from "./useBlitzGame";
import useBlitzSettlement from "./useBlitzSettlement";
import useNow from "../mp/useNow";
import { insertAction } from "../mp/tableActions";
import { effectiveHostId, HEARTBEAT_INTERVAL_MS } from "../mp/hostLease";
import MpResultPopout from "../mp/MpResultPopout";
import BlitzSeatCard from "./BlitzSeatCard";
import BlitzLocalGame from "./BlitzLocalGame";
import {
  ENTRY_FEE,
  SEAT_COUNT,
  UNSTICK_MS,
  normalizeSeats,
  startBlitzTournament,
  blitzResetFields,
} from "./blitzEngine";

const STATUS_LABEL = {
  waiting_for_bets: "Seating — pay entry to join",
  player_turns: "Blitz active",
  settling: "Scoring finalists",
  completed: "Tournament complete",
  resetting: "Resetting",
};

export default function BlitzTournament({ user, onUserUpdate, onOpenCashier }) {
  const { table, loading, patch, reload, polling } = useBlitzTable(user);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingJoin, setPendingJoin] = useState(null);

  const now = useNow(1000);

  // Detect admin reset.
  const adminResetRef = useRef(0);
  useEffect(() => {
    const resetAt = Number(table?.admin_reset_at) || 0;
    if (!resetAt) return;
    if (resetAt !== adminResetRef.current) {
      if (adminResetRef.current !== 0) {
        toast.info("The table was reset by an admin.");
        setResult(null);
        setPendingJoin(null);
      }
      adminResetRef.current = resetAt;
    }
  }, [table?.admin_reset_at]);

  useBlitzHostEngine({ table, patch, user });
  useBlitzSettlement({ table, user, patch, onUserUpdate });

  const seats = normalizeSeats(table?.seats);
  const mySeat = seats.find((s) => s.user_id === user?.id) || null;
  const chips = Number(user?.casinoChips) || 0;
  const status = table?.status || "waiting_for_bets";
  const inPlay = status === "player_turns" || status === "settling";
  const isHost = !!mySeat && effectiveHostId(table, now) === user?.id;
  const blitzEndsAt = Number(table?.blitz_ends_at) || 0;
  const prizePool = Number(table?.prize_pool) || 0;
  const paidSeats = seats.filter((s) => s.user_id && Number(s.bet_chips) >= ENTRY_FEE);
  const canJoin = !mySeat && !inPlay;

  // Countdown.
  const blitzSeconds = blitzEndsAt
    ? Math.max(0, Math.ceil((blitzEndsAt - now) / 1000))
    : null;

  // Clear pending join when seat is ours.
  useEffect(() => {
    if (mySeat && pendingJoin !== null && mySeat.seat_id === pendingJoin) {
      setPendingJoin(null);
    }
  }, [mySeat?.seat_id, pendingJoin]);

  // Pop the result popout when the tournament completes.
  useEffect(() => {
    if (status === "completed" && mySeat && mySeat.payout_flag && mySeat.payout_flag !== "PENDING" && !table?.next_action) {
      const payout =
        mySeat.payout_flag === "WINNER" || mySeat.payout_flag === "SPLIT"
          ? Number(mySeat.payout_amount) || 0
          : 0;
      setResult({ flag: mySeat.payout_flag, amount: payout });
    } else if (status !== "completed") {
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mySeat?.payout_flag, mySeat?.payout_amount, table?.next_action]);

  // Presence heartbeat.
  const beatRef = useRef({});
  beatRef.current = { table, user, mySeatId: mySeat?.seat_id };
  useEffect(() => {
    if (!mySeat?.seat_id || !table?.id) return;
    const sendBeat = () => {
      if (document.visibilityState !== "visible") return;
      const s = beatRef.current;
      if (!s.table || !s.user || !s.mySeatId) return;
      insertAction({
        table_id: s.table.id,
        round_id: s.table.round_id,
        user_id: s.user.id,
        user_name: s.user.full_name || s.user.email?.split("@")[0] || "Player",
        action_type: "HEARTBEAT",
        seat_id: s.mySeatId,
      }).catch(() => {});
    };
    sendBeat();
    const iv = setInterval(sendBeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [mySeat?.seat_id, table?.id, table?.round_id]);

  // Best-effort page-hide flag.
  useEffect(() => {
    if (!mySeat || !inPlay) return;
    const handler = () => {
      const { table: t, user: u } = beatRef.current;
      if (!t || !u) return;
      insertAction({
        table_id: t.id,
        round_id: t.round_id,
        user_id: u.id,
        user_name: u.full_name || u.email?.split("@")[0] || "Player",
        action_type: "LEAVE",
        seat_id: mySeat.seat_id,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [mySeat?.seat_id, inPlay]);

  // ── Actions ──────────────────────────────────────────────────────

  const submitAction = async (payload) => {
    if (!table) return null;
    return await insertAction({
      ...payload,
      table_id: table.id,
      round_id: table.round_id,
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Player",
    });
  };

  const joinSeat = async (seatId) => {
    if (busy || !table || !user || mySeat) return;
    if (chips < ENTRY_FEE) {
      toast.error(`You need ${ENTRY_FEE} chips to enter the Blitz tournament.`);
      return;
    }
    setBusy(true);
    setPendingJoin(seatId);
    try {
      await submitAction({ action_type: "JOIN", seat_id: seatId });
    } finally {
      setBusy(false);
    }
  };

  // Pay the entry fee after the seat claim lands. Best-effort targeted rollback:
  // if the deduction fails, submit LEAVE (the host only clears the seat if it
  // still belongs to this user).
  const payEntryFee = async () => {
    if (busy || !mySeat || !table || status !== "waiting_for_bets") return;
    if (Number(mySeat.bet_chips) >= ENTRY_FEE) return;
    setBusy(true);
    try {
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < ENTRY_FEE) {
        toast.error(`Not enough chips. You need ${ENTRY_FEE} to enter.`);
        // Rollback: leave the seat.
        await submitAction({ action_type: "LEAVE", seat_id: mySeat.seat_id });
        return;
      }
      await base44.auth.updateMe({ casinoChips: balance - ENTRY_FEE });
      await onUserUpdate?.();
      logChipMovement({
        user,
        action_type: "bet",
        amount: -ENTRY_FEE,
        balance_after: balance - ENTRY_FEE,
        detail: `Blitz Tournament entry fee (${ENTRY_FEE})`,
      });
      await submitAction({ action_type: "ACCEPT_BET", seat_id: mySeat.seat_id, wager: ENTRY_FEE });
      toast.success(`${ENTRY_FEE} chips paid — you're in!`);
    } catch (e) {
      // Best-effort rollback: if the wallet deduction failed, free the seat.
      try {
        await submitAction({ action_type: "LEAVE", seat_id: mySeat.seat_id });
      } catch {}
      toast.error("Entry fee payment failed — your seat was released.");
    } finally {
      setBusy(false);
    }
  };

  const leaveSeat = async () => {
    if (busy || !mySeat || !table) return;
    setBusy(true);
    try {
      // Pre-tournament leave: if the entry fee was paid but the tournament
      // hasn't started, self-refund.
      if (!inPlay && Number(mySeat.bet_chips) >= ENTRY_FEE && status === "waiting_for_bets") {
        const refund = ENTRY_FEE;
        const guardKey = `blitz_refund_${table.round_id}_${mySeat.seat_id}`;
        let already = false;
        try { already = localStorage.getItem(guardKey) === "1"; } catch { already = false; }
        if (!already) {
          try { localStorage.setItem(guardKey, "1"); } catch {}
          const fresh = await base44.auth.me();
          const balance = Number(fresh?.casinoChips) || 0;
          await base44.auth.updateMe({ casinoChips: balance + refund });
          await onUserUpdate?.();
          logChipMovement({
            user,
            action_type: "push",
            amount: refund,
            balance_after: balance + refund,
            detail: `Blitz Tournament entry fee withdrawn (${refund})`,
          });
        }
      }
      await submitAction({ action_type: "LEAVE", seat_id: mySeat.seat_id });
      toast.success(inPlay ? "You left the tournament." : "You left the table.");
    } finally {
      setBusy(false);
    }
  };

  // Host manually starts the tournament (2-4 paid seats).
  const startNow = async () => {
    if (busy || !table || status !== "waiting_for_bets" || !isHost) return;
    if (paidSeats.length < 2) return;
    setBusy(true);
    try {
      const fields = startBlitzTournament(seats, Date.now());
      await patch(fields);
      toast.success("Blitz tournament started!");
    } finally {
      setBusy(false);
    }
  };

  const chooseNext = async (action) => {
    if (busy || !table || status !== "completed") return;
    if (table.next_action) return;
    if (!isHost) return;
    setBusy(true);
    try {
      await patch({ next_action: action, last_action_timestamp: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  const resetTable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const fresh = await reload();
      if (!fresh) return;
      if (fresh.status === "completed") {
        toast.info("That tournament already finished — nothing to reset.");
        return;
      }
      await patch({ ...blitzResetFields(user.id, Date.now()) });
      toast.success("Table reset.");
    } finally {
      setBusy(false);
    }
  };

  // ── Local game ───────────────────────────────────────────────────

  const submitScore = async (score) => {
    if (!table || !mySeat || !inPlay) return;
    try {
      await insertAction({
        table_id: table.id,
        round_id: table.round_id,
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Player",
        action_type: "BLITZ_SCORE",
        seat_id: mySeat.seat_id,
        wager: score,
      });
    } catch {}
  };

  const game = useBlitzGame({
    active: status === "player_turns" && !!mySeat,
    blitzEndsAt,
    onSubmitScore: submitScore,
  });

  // ── Render ───────────────────────────────────────────────────────

  if (loading || !table) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-200/30 border-t-amber-300 animate-spin" />
      </div>
    );
  }

  const leaseValid = Number(table?.host_lease_expires_at || 0) > now;
  const canUnstick =
    !!table &&
    status !== "completed" &&
    !leaseValid &&
    now - Number(table?.last_action_timestamp || 0) > UNSTICK_MS;

  const showLocalGame = status === "player_turns" && !!mySeat;
  const showScore = status === "player_turns" || status === "settling" || status === "completed";

  return (
    <div className="w-full max-w-sm mx-auto">
      <MpResultPopout result={result} onDismiss={() => setResult(null)} />

      <div
        className="mp-online-table relative rounded-2xl border border-border p-3 flex flex-col gap-3 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)",
          }}
        />

        {/* Header: title + countdown + sync */}
        <div className="relative flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
            BLITZ TOURNAMENT
          </span>
          {blitzSeconds !== null && blitzSeconds > 0 && (
            <span className="text-lg font-black text-amber-300 tabular-nums">
              {blitzSeconds}s
            </span>
          )}
          {blitzSeconds !== null && blitzSeconds === 0 && (
            <span className="text-sm font-black text-rose-300 animate-pulse">TIME!</span>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${
              polling ? "text-amber-300/70" : "text-emerald-300/80"
            }`}
          >
            {polling ? <WifiOff className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
            {polling ? "Polling" : "Live"}
          </span>
        </div>

        {/* Balance + Cashier */}
        <div className="relative flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCashier}
            className="mr-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 border border-amber-300 text-emerald-950 text-[11px] font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(212,175,55,0.4)] hover:brightness-105 transition"
          >
            <MiniChipIcon size={14} /> Cashier
          </button>
          <div
            className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30"
            title="Your Blackjack 21 chips"
          >
            <MiniChipIcon size={14} />
            <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
          </div>
        </div>

        {/* Prize pool */}
        <div
          className="relative rounded-2xl border p-3 transition-all"
          style={{
            background: inPlay || status === "completed"
              ? "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(16,185,129,0.10))"
              : "rgba(255,255,255,0.06)",
            borderColor: inPlay || status === "completed" ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.15)",
            boxShadow: inPlay ? "0 0 22px rgba(212,175,55,0.18)" : "none",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
              Prize Pool
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">
              {paidSeats.length}/{SEAT_COUNT} paid · {ENTRY_FEE} entry
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 py-1">
            <MiniChipIcon size={22} />
            <span className="text-2xl font-black text-amber-300 tabular-nums">
              {prizePool > 0 ? prizePool : "—"}
            </span>
          </div>
          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-emerald-100/60">
            Winner takes all
          </p>
        </div>

        {/* Seats */}
        <div className="flex flex-col gap-2">
          {seats.map((s) => (
            <BlitzSeatCard
              key={s.seat_id}
              seat={s}
              isMe={s.user_id === user?.id}
              isHostSeat={!!s.user_id && s.user_id === table?.host_user_id}
              canJoin={canJoin && !s.user_id && pendingJoin !== s.seat_id}
              onJoin={() => joinSeat(s.seat_id)}
              showScore={showScore}
              showResult={status === "completed"}
            />
          ))}
        </div>

        {pendingJoin !== null && !mySeat && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Taking seat {pendingJoin}…
          </p>
        )}

        {/* Seating phase controls */}
        {status === "waiting_for_bets" && mySeat && Number(mySeat.bet_chips) < ENTRY_FEE && (
          <button
            onClick={payEntryFee}
            disabled={busy || chips < ENTRY_FEE}
            className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
            style={{ background: "#d4af37" }}
          >
            <Coins className="inline mr-1 w-4 h-4" /> Pay {ENTRY_FEE} Entry Fee
          </button>
        )}

        {status === "waiting_for_bets" && isHost && paidSeats.length >= 2 && paidSeats.length < SEAT_COUNT && (
          <button
            onClick={startNow}
            disabled={busy}
            className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 transition disabled:opacity-40"
            style={{ background: "#d4af37" }}
          >
            <Play className="inline mr-1 w-4 h-4" /> Start Tournament ({paidSeats.length} players)
          </button>
        )}

        {status === "waiting_for_bets" && !mySeat && pendingJoin === null && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Tap an open seat to join. {ENTRY_FEE}-chip entry fee.
          </p>
        )}

        {/* Active phase: local game */}
        {showLocalGame && (
          <BlitzLocalGame
            blitzChips={game.blitzChips}
            playerHand={game.playerHand}
            dealerHand={game.dealerHand}
            wager={game.wager}
            phase={game.phase}
            canDouble={game.canDouble}
            result={game.result}
            locked={game.locked}
            eliminated={game.eliminated}
            dealerThinking={game.dealerThinking}
            revealHole={game.revealHole}
            onDeal={game.dealHand}
            onHit={game.hit}
            onStand={game.stand}
            onDoubleClick={game.doubleDown}
          />
        )}

        {status === "player_turns" && !mySeat && (
          <p className="text-center text-[11px] font-bold text-amber-200/70">
            Tournament in progress — join a seat for the next one.
          </p>
        )}

        {status === "settling" && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Scoring finalists…
          </p>
        )}

        {/* Completed phase */}
        {status === "completed" && mySeat && (
          <div className="flex flex-col gap-2">
            {table.next_action ? (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-200/80 py-2">
                <span className="w-3 h-3 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
                {table.next_action === "new_bet" ? "Opening new tournament…" : "Closing the table…"}
              </div>
            ) : (
              <>
                <p className="text-center text-[11px] font-bold text-amber-200/80">
                  {isHost ? "Tournament complete — choose next:" : "Tournament complete — wait for the host."}
                </p>
                <div className={`grid ${isHost ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                  {isHost && (
                    <button
                      onClick={() => chooseNext("new_bet")}
                      disabled={busy}
                      className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                      style={{ background: "#d4af37" }}
                    >
                      <Coins className="inline mr-1 w-4 h-4" /> New
                    </button>
                  )}
                  <button
                    onClick={() => chooseNext("stop")}
                    disabled={busy}
                    className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-rose-50 bg-rose-700/70 border border-rose-400/40 disabled:opacity-40 transition"
                  >
                    <LogOut className="inline mr-1 w-4 h-4" /> End Game
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {status === "completed" && !mySeat && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Tournament complete — join a seat for the next one.
          </p>
        )}

        {canUnstick && (
          <button
            onClick={resetTable}
            disabled={busy}
            className="w-full py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-rose-100 bg-rose-700/50 border border-rose-400/40 hover:bg-rose-700/70 transition disabled:opacity-40"
          >
            <RotateCcw className="inline w-3.5 h-3.5 mr-1" /> Unstick Table
          </button>
        )}

        {mySeat && status !== "completed" && (
          <button
            onClick={leaveSeat}
            disabled={busy}
            className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-100/70 border border-white/15 hover:text-emerald-50 transition disabled:opacity-40"
          >
            <LogOut className="inline w-3 h-3 mr-1" /> Leave Table
          </button>
        )}

        <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
          5-Player 60-Second Blitz. Each player plays their own local dealer.
          Best-effort client-hosted coordination — payouts are not atomic and a
          disconnect at the wrong moment may require a manual unstick.
        </p>
      </div>
    </div>
  );
}