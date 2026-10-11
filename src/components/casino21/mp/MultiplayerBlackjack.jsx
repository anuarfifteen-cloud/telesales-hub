import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Plus,
  Shield,
  RotateCcw,
  LogOut,
  Radio,
  WifiOff,
  Users,
  Coins,
} from "lucide-react";
import { logChipMovement } from "@/lib/chipLog";
import MiniChipIcon from "../MiniChipIcon";
import useActiveTable from "./useActiveTable";
import useHostEngine from "./useHostEngine";
import useSettlement from "./useSettlement";
import useNow from "./useNow";
import MpPotBanner from "./MpPotBanner";
import MpSeatCard from "./MpSeatCard";
import MpBetControls from "./MpBetControls";
import { insertAction } from "./tableActions";
import { playShuffle, playChipChime, playWinFanfare, playLoss, playPush } from "@/lib/sounds";
import {
  MIN_BET,
  MAX_BET,
  UNSTICK_MS,
  BET_IDLE_MS,
  normalizeSeats,
  isCommitted,
  payoutFor,
  newRoundId,
} from "./mpEngine";
import { effectiveHostId, HEARTBEAT_INTERVAL_MS } from "./hostLease";
import MpResultPopout from "./MpResultPopout";

const STATUS_LABEL = {
  waiting_for_bets: "Waiting for bets",
  player_turns: "Players playing",
  settling: "Scoring the pot",
  completed: "Round complete",
  resetting: "Resetting",
};

// Shared-table Multiplayer Blackjack PvP: 1–5 seats, equal wagers, winner-take-
// -all pot, run entirely from the clients on the free plan.
//
// Collision-safe by design: players NEVER edit the shared table row directly
// for game actions. They INSERT a TableAction record (JOIN, LEAVE, ACCEPT_BET,
// DECLINE_BET, HIT, STAND) and the host's engine is the sole writer that
// applies each action to the table. Inserts are new rows, so N players tapping
// at the exact same millisecond produce N clean records with no last-write-wins
// overwrite. Card play is strictly turn-based: only the seat matching
// current_turn_seat can submit a HIT/STAND, so a single hand is modified at a
// time.
//
// Coordination is best-effort (see the footnote): the host runs the engine, and
// if the host closes their tab mid-round the engine stops until another seat
// claims it; any player can use the emergency reset to unstick the table.
export default function MultiplayerBlackjack({ user, onUserUpdate, onOpenCashier }) {
  const { table, loading, patch, reload, polling } = useActiveTable(user);
  const [bet, setBet] = useState(MIN_BET);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [chipFx, setChipFx] = useState(0);

  // Pending-action guards: stay true after we INSERT an action until the table
  // reflects it. They prevent double-submits (e.g. two HITs before the host
  // applies the first) and drive the "submitting…" UI.
  const [pendingBet, setPendingBet] = useState(false);
  const [pendingHit, setPendingHit] = useState(false);
  const [pendingStand, setPendingStand] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null); // seatId we're waiting to claim
  const [pendingLeave, setPendingLeave] = useState(false);
  const prevCardsRef = useRef(0);

  const now = useNow(1000);

  // Detect an admin force-reset: when admin_reset_at changes, show a brief
  // alert and clear local pending/result state so the player returns to the
  // open-table view.
  const adminResetRef = useRef(0);
  useEffect(() => {
    const resetAt = Number(table?.admin_reset_at) || 0;
    if (!resetAt) return;
    if (resetAt !== adminResetRef.current) {
      if (adminResetRef.current !== 0) {
        toast.info("The table was reset by an admin. All wagers have been refunded.");
        setResult(null);
        setPendingBet(false);
        setPendingHit(false);
        setPendingStand(false);
        setPendingJoin(null);
        setPendingLeave(false);
      }
      adminResetRef.current = resetAt;
    }
  }, [table?.admin_reset_at]);

  useHostEngine({ table, patch, user });
  useSettlement({ table, user, patch, onUserUpdate });

  const seats = normalizeSeats(table?.seats);
  const mySeat = seats.find((s) => s.user_id === user?.id) || null;
  const chips = Number(user?.casinoChips) || 0;
  const status = table?.status || "waiting_for_bets";
  const inPlay = status === "player_turns" || status === "settling";
  const commonWager = Number(table?.common_wager) || 0;
  const totalPot = Number(table?.total_pot) || 0;
  const isHost = !!mySeat && effectiveHostId(table, now) === user?.id;
  const currentTurn = Number(table?.current_turn_seat) || 0;

  // Clear pending flags once the table reflects the submitted action.
  useEffect(() => {
    if (!mySeat) {
      setPendingJoin(null);
      setPendingBet(false);
      setPendingHit(false);
      setPendingStand(false);
    } else {
      if (pendingJoin !== null && mySeat.seat_id === pendingJoin) setPendingJoin(null);
      if (pendingBet && Number(mySeat.bet_chips) > 0) setPendingBet(false);
      if (pendingHit && (mySeat.cards || []).length > prevCardsRef.current) setPendingHit(false);
      if (pendingStand && (mySeat.status === "stood" || currentTurn !== mySeat.seat_id)) setPendingStand(false);
    }
    prevCardsRef.current = mySeat ? (mySeat.cards || []).length : 0;
    if (!mySeat && pendingLeave) setPendingLeave(false);
  }, [mySeat?.seat_id, mySeat?.bet_chips, mySeat?.cards?.length, mySeat?.status, currentTurn, pendingJoin, pendingBet, pendingHit, pendingStand, pendingLeave]);

  // Inactivity countdown for uncommitted seated players (auto-kick after 60s).
  const idleMsFor = (seat) => {
    if (!seat || !seat.user_id) return null;
    if (isCommitted(seat)) return null;
    if (seat.status === "disconnected") return null;
    const la = Number(seat.last_activity || 0);
    if (!la) return null;
    return Math.max(0, BET_IDLE_MS - (now - la));
  };
  const myIdleMs = status === "waiting_for_bets" ? idleMsFor(mySeat) : null;
  const myIdleSeconds = myIdleMs !== null ? Math.ceil(myIdleMs / 1000) : null;

  const dealtIn = seats.filter((s) => s.user_id && (s.cards || []).length > 0);
  const finishedCount = dealtIn.filter(
    (s) => s.status === "stood" || s.status === "busted" || s.status === "disconnected"
  ).length;

  const betSeconds = table?.betting_ends_at
    ? Math.max(0, Math.ceil((table.betting_ends_at - now) / 1000))
    : null;
  const turnSeconds =
    status === "player_turns" && Number(table?.reveal_deadline) > 0
      ? Math.max(0, Math.ceil((Number(table.reveal_deadline) - now) / 1000))
      : null;

  const leaseValid = Number(table?.host_lease_expires_at || 0) > now;
  const canUnstick =
    !!table &&
    status !== "completed" &&
    !leaseValid &&
    now - Number(table?.last_action_timestamp || 0) > UNSTICK_MS;
  const canJoin = !mySeat && !inPlay;

  // Turn-based: only the active player can HIT/STAND.
  const isMyTurn =
    !!mySeat &&
    status === "player_turns" &&
    currentTurn === mySeat.seat_id &&
    mySeat.status === "playing";
  const canHit = isMyTurn && !pendingHit;
  const canStand = isMyTurn && !pendingStand;

  // Card-shuffle flourish when a player opens the table.
  const didEnterRef = useRef(false);
  useEffect(() => {
    if (didEnterRef.current) return;
    didEnterRef.current = true;
    playShuffle();
  }, []);

  // Presence heartbeat: every few seconds while seated and visible, ping the
  // host so it knows this browser is still alive. The host updates the seat's
  // last_seen; a seat not seen within the presence timeout is freed.
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

  // Pop the win/loss result exactly once per completed round.
  useEffect(() => {
    const showResult =
      status === "completed" &&
      mySeat &&
      (mySeat.cards || []).length > 0 &&
      !table?.next_action;
    if (showResult) {
      const flag = mySeat.payout_flag;
      setResult({ flag, amount: payoutFor(flag, mySeat.bet_chips, mySeat.payout_amount) });
      if (flag === "WINNER" || flag === "SPLIT") playWinFanfare();
      else if (flag === "LOSS") playLoss();
      else if (flag === "REFUND") playPush();
    } else {
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mySeat?.payout_flag, mySeat?.seat_id, table?.next_action]);

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
    setBusy(true);
    setPendingJoin(seatId);
    try {
      await submitAction({ action_type: "JOIN", seat_id: seatId });
      playShuffle();
    } finally {
      setBusy(false);
    }
  };

  const leaveSeat = async () => {
    if (busy || !mySeat || !table) return;
    setBusy(true);
    setPendingLeave(true);
    try {
      // Self-refund an un-played bet before leaving (the host can't credit
      // another wallet). A per-round guard stops the settlement hook from
      // double-crediting if the host also flags a refund.
      if (!inPlay && Number(mySeat.bet_chips) > 0) {
        const refund = Number(mySeat.bet_chips);
        const guardKey = `mp_settled_${table.round_id}_${mySeat.seat_id}_REFUND`;
        let already = false;
        try { already = localStorage.getItem(guardKey) === "1"; } catch { already = false; }
        if (!already) {
          try { localStorage.setItem(guardKey, "1"); } catch { /* private mode */ }
          const fresh = await base44.auth.me();
          const balance = Number(fresh?.casinoChips) || 0;
          await base44.auth.updateMe({ casinoChips: balance + refund });
          await onUserUpdate?.();
          logChipMovement({
            user,
            action_type: "push",
            amount: refund,
            balance_after: balance + refund,
            detail: `Multiplayer Blackjack bet withdrawn (${refund})`,
          });
        }
      }
      await submitAction({ action_type: "LEAVE", seat_id: mySeat.seat_id });
      toast.success(inPlay ? "You're out of this round — your hand stands." : "You left the table.");
    } finally {
      setBusy(false);
    }
  };

  const placeBet = async (amount) => {
    if (busy || !mySeat || !table || status !== "waiting_for_bets") return;
    if (pendingBet) return;
    const locked = commonWager > 0;
    if (!locked && !isHost) return; // only the host sets the buy-in
    const wager = locked
      ? commonWager
      : Math.max(MIN_BET, Math.min(MAX_BET, Math.round(Number(amount) || MIN_BET)));
    setBusy(true);
    try {
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < wager) {
        if (!locked) toast.error("Not enough chips for that wager.");
        return;
      }
      await base44.auth.updateMe({ casinoChips: balance - wager });
      await onUserUpdate?.();
      logChipMovement({
        user,
        action_type: "bet",
        amount: -wager,
        balance_after: balance - wager,
        detail: `Multiplayer Blackjack PvP bet ${wager}`,
      });
      const firstWager = !commonWager;
      await submitAction({ action_type: "ACCEPT_BET", seat_id: mySeat.seat_id, wager });
      setPendingBet(true);
      playChipChime();
      setChipFx((x) => x + 1);
      toast.success(firstWager ? `Buy-in set to ${wager}.` : `Matched ${wager} chips.`);
    } finally {
      setBusy(false);
    }
  };

  const declineSeat = async () => {
    if (busy || !mySeat || !table) return;
    setBusy(true);
    try {
      await submitAction({ action_type: "DECLINE_BET", seat_id: mySeat.seat_id });
      toast.success("You declined the buy-in and left the table.");
    } finally {
      setBusy(false);
    }
  };

  const hit = async () => {
    if (!canHit || busy) return;
    setBusy(true);
    setPendingHit(true);
    try {
      await submitAction({ action_type: "HIT", seat_id: mySeat.seat_id });
    } finally {
      setBusy(false);
    }
  };

  const stand = async () => {
    if (!canStand || busy) return;
    setBusy(true);
    setPendingStand(true);
    try {
      await submitAction({ action_type: "STAND", seat_id: mySeat.seat_id });
    } finally {
      setBusy(false);
    }
  };

  // After a round, the host can choose New Bet or End Game; the host engine
  // applies the transition.
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

  // Emergency unstick — refunds any open wager and restarts the room. Always
  // re-reads first: a finished round takes priority, settled results stand.
  const resetTable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const fresh = await reload();
      if (!fresh) return;
      if (fresh.status === "completed") {
        toast.info("That round already finished — nothing to reset.");
        return;
      }
      const next = normalizeSeats(fresh.seats).map((s) => {
        if (s.user_id && Number(s.bet_chips) > 0 && s.payout_flag === "PENDING") {
          return { ...s, cards: [], hand_value: 0, status: "betting", ready: false, auto_replay: false, payout_flag: "REFUND", payout_amount: Number(s.bet_chips) };
        }
        return { ...s, cards: [], hand_value: 0, status: s.user_id ? "betting" : "empty", ready: false, auto_replay: false };
      });
      await patch({
        seats: next,
        deck: [],
        status: "waiting_for_bets",
        current_turn_seat: 1,
        betting_ends_at: 0,
        deal_at: 0,
        reveal_deadline: 0,
        common_wager: 0,
        total_pot: 0,
        next_action: null,
        round_id: newRoundId(),
        last_action_timestamp: Date.now(),
      });
      toast.success("Table reset. Open bets are being returned.");
    } finally {
      setBusy(false);
    }
  };

  // Best-effort: flag this player as away when the tab is closed mid-round, by
  // inserting a LEAVE action for the host to apply.
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

  if (loading || !table) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-200/30 border-t-amber-300 animate-spin" />
      </div>
    );
  }

  const goldBtn =
    "py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-30 transition";
  const goldStyle = { background: "#d4af37" };

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

        {/* Table strip: round, phase, sync state */}
        <div className="relative flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-amber-300/80" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">
            {STATUS_LABEL[status] || status}
          </span>
          <span className="text-[10px] text-amber-200/50 tabular-nums">{table.round_id}</span>
          <span
            className={`ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${
              polling ? "text-amber-300/70" : "text-emerald-300/80"
            }`}
          >
            {polling ? <WifiOff className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
            {polling ? "Polling" : "Live"}
          </span>
        </div>

        {/* Balance + cashier */}
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

        <MpPotBanner
          pot={totalPot}
          commonWager={commonWager}
          active={inPlay || status === "completed"}
          chipFx={chipFx}
        />

        <div className="mp-seat-list flex flex-col gap-2">
          {seats.map((s) => (
            <MpSeatCard
              key={s.seat_id}
              seat={s}
              isMe={s.user_id === user?.id}
              isHostSeat={!!s.user_id && s.user_id === table?.host_user_id}
              canJoin={canJoin && !s.user_id && pendingJoin !== s.seat_id}
              onJoin={() => joinSeat(s.seat_id)}
              revealCards={status === "settling" || status === "completed"}
              idleMs={status === "waiting_for_bets" ? idleMsFor(s) : null}
              isTurn={status === "player_turns" && currentTurn === s.seat_id && s.status === "playing"}
            />
          ))}
        </div>

        {pendingJoin !== null && !mySeat && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Taking seat {pendingJoin}…
          </p>
        )}

        {!mySeat && pendingJoin === null && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Tap an open seat to join the table.
          </p>
        )}

        {mySeat && status === "waiting_for_bets" && (
          <div className="relative">
            {Number(mySeat.bet_chips) > 0 ? (
              <div className="rounded-2xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5 flex items-center gap-2">
                <MiniChipIcon size={14} />
                <span className="text-xs font-bold text-amber-200">
                  {mySeat.bet_chips} chips locked in
                </span>
                <span className="ml-auto text-[10px] font-bold text-amber-200/70 tabular-nums">
                  {betSeconds !== null ? `dealing in ${betSeconds}s` : "waiting for players"}
                </span>
              </div>
            ) : (
              <>
                {myIdleSeconds !== null && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-900/30 px-3 py-2 mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-rose-200/90">
                      Auto-kick in
                    </span>
                    <span className="text-sm font-black text-rose-200 tabular-nums">
                      {myIdleSeconds}s
                    </span>
                  </div>
                )}
                <MpBetControls
                  bet={bet}
                  setBet={setBet}
                  chips={chips}
                  busy={busy}
                  pending={pendingBet}
                  commonWager={commonWager}
                  isHost={isHost}
                  betSeconds={betSeconds}
                  onPlace={placeBet}
                  onDecline={declineSeat}
                  onOpenCashier={onOpenCashier}
                />
              </>
            )}
          </div>
        )}

        {status === "player_turns" && mySeat && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-200/80 tabular-nums">
              <span>
                {isMyTurn
                  ? turnSeconds !== null
                    ? `Your turn — ${turnSeconds}s`
                    : "Your turn"
                  : currentTurn
                  ? `Seat ${currentTurn} is playing`
                  : "Playing"}
              </span>
              <span>
                {finishedCount}/{dealtIn.length} done
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={hit} disabled={!canHit || busy} className={goldBtn} style={goldStyle}>
                <Plus className="inline mr-1 w-4 h-4" /> Hit
              </button>
              <button onClick={stand} disabled={!canStand || busy} className={goldBtn} style={goldStyle}>
                <Shield className="inline mr-1 w-4 h-4" /> Stand
              </button>
            </div>
            {pendingHit && (
              <p className="text-center text-[11px] font-bold text-amber-200/80">
                Drawing a card…
              </p>
            )}
            {pendingStand && (
              <p className="text-center text-[11px] font-bold text-amber-200/80">
                Standing…
              </p>
            )}
            {mySeat.status === "busted" && (
              <p className="text-center text-[11px] font-bold text-rose-300/90">
                You busted — waiting for the round to finish.
              </p>
            )}
            {(mySeat.status === "stood" || mySeat.status === "disconnected") && currentTurn !== mySeat.seat_id && (
              <p className="text-center text-[11px] font-bold text-amber-200/80">
                You stood — waiting for the other players.
              </p>
            )}
          </div>
        )}

        {status === "player_turns" && !mySeat && (
          <p className="text-center text-[11px] font-bold text-amber-200/70">
            Round in progress — join a seat for the next round.
          </p>
        )}

        {status === "settling" && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Scoring the pot…
          </p>
        )}

        {status === "completed" && mySeat && (
          <div className="flex flex-col gap-2">
            {table.next_action ? (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-200/80 py-2">
                <span className="w-3 h-3 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
                {table.next_action === "new_bet"
                  ? "Opening new bets…"
                  : "Closing the table…"}
              </div>
            ) : (
              <>
                <p className="text-center text-[11px] font-bold text-amber-200/80">
                  {isHost
                    ? "Round complete — choose the next move:"
                    : "Round complete — end the game or wait for the host."}
                </p>
                <div className={`grid ${isHost ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                  {isHost && (
                    <button
                      onClick={() => chooseNext("new_bet")}
                      disabled={busy}
                      className={goldBtn}
                      style={goldStyle}
                      title="Same players, choose a new wager"
                    >
                      <Coins className="inline mr-1 w-4 h-4" /> New Bet
                    </button>
                  )}
                  <button
                    onClick={() => chooseNext("stop")}
                    disabled={busy}
                    className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-rose-50 bg-rose-700/70 border border-rose-400/40 disabled:opacity-40 transition"
                    title="Clear the table and leave"
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
            Round complete — join a seat for the next round.
          </p>
        )}

        {canUnstick && (
          <button
            onClick={resetTable}
            disabled={busy}
            className="w-full py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-rose-100 bg-rose-700/50 border border-rose-400/40 hover:bg-rose-700/70 transition disabled:opacity-40"
          >
            <RotateCcw className="inline w-3.5 h-3.5 mr-1" /> Unstick Table & Refund Bets
          </button>
        )}

        {mySeat && (
          <button
            onClick={leaveSeat}
            disabled={busy || pendingLeave}
            className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-100/70 border border-white/15 hover:text-emerald-50 transition disabled:opacity-40"
          >
            <LogOut className="inline w-3 h-3 mr-1" /> {pendingLeave ? "Leaving…" : "Leave Table"}
          </button>
        )}

        <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
          Casual, non-monetary prototype. PvP winner-take-all — actions are
          queued and the host's browser is the sole table writer, so turns,
          timers and payouts are best-effort without atomic server-side
          settlement. A disconnect at the wrong moment can leave a result
          unsettled; use Unstick to refund.
        </p>
      </div>
    </div>
  );
}