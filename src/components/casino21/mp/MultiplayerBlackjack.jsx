import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Shield, RotateCcw, LogOut, Radio, WifiOff, Users } from "lucide-react";
import { handValue } from "../blackjackDeck";
import { logChipMovement } from "@/lib/chipLog";
import MiniChipIcon from "../MiniChipIcon";
import useActiveTable from "./useActiveTable";
import useHostEngine from "./useHostEngine";
import useSettlement from "./useSettlement";
import useNow from "./useNow";
import MpDealerPanel from "./MpDealerPanel";
import MpSeatCard from "./MpSeatCard";
import MpBetControls from "./MpBetControls";
import {
  MIN_BET,
  MAX_BET,
  BETTING_MS,
  TURN_MS,
  UNSTICK_MS,
  normalizeSeats,
  nextPlayingSeat,
  newRoundId,
} from "./mpEngine";

const STATUS_LABEL = {
  waiting_for_bets: "Waiting for bets",
  player_turns: "Players playing",
  dealer_turn: "Dealer playing",
  completed: "Round complete",
  resetting: "Resetting",
};

// Shared-table Multiplayer Blackjack: 1–5 seats against one Dealer, run entirely
// from the clients on the free plan. Every rule lives in the shared table row,
// so all screens agree — but coordination is best-effort (see the footnote).
export default function MultiplayerBlackjack({ user, onUserUpdate, onOpenCashier }) {
  const { table, loading, patch, reload, polling } = useActiveTable(user);
  const [bet, setBet] = useState(MIN_BET);
  const [busy, setBusy] = useState(false);
  const now = useNow(1000);

  useHostEngine({ table, patch, user });
  useSettlement({ table, user, patch, onUserUpdate });

  const seats = normalizeSeats(table?.seats);
  const mySeat = seats.find((s) => s.user_id === user?.id) || null;
  const chips = Number(user?.casinoChips) || 0;
  const status = table?.status || "waiting_for_bets";
  const inPlay = status === "player_turns" || status === "dealer_turn";
  const isMyTurn =
    !!mySeat &&
    status === "player_turns" &&
    table?.current_turn_seat === mySeat.seat_id &&
    mySeat.status === "playing";
  const turnSeat = seats.find((s) => s.seat_id === table?.current_turn_seat) || null;
  const betSeconds = table?.betting_ends_at
    ? Math.max(0, Math.ceil((table.betting_ends_at - now) / 1000))
    : null;
  const turnSeconds =
    status === "player_turns"
      ? Math.max(0, Math.ceil((Number(table?.last_action_timestamp || 0) + TURN_MS - now) / 1000))
      : null;
  const canUnstick =
    !!table && status !== "completed" && now - Number(table?.last_action_timestamp || 0) > UNSTICK_MS;
  const canJoin = !mySeat && !inPlay;

  const joinSeat = async (seatId) => {
    if (busy || !table || !user) return;
    setBusy(true);
    try {
      const next = seats.map((s) =>
        s.seat_id === seatId
          ? {
              ...s,
              user_id: user.id,
              user_name: user.full_name || user.email?.split("@")[0] || "Player",
              bet_chips: 0,
              cards: [],
              hand_value: 0,
              status: "betting",
              payout_flag: "PENDING",
              payout_claimed: false,
            }
          : s
      );
      await patch({ seats: next, host_user_id: table.host_user_id || user.id });
    } finally {
      setBusy(false);
    }
  };

  const leaveSeat = async () => {
    if (busy || !mySeat || !table) return;
    setBusy(true);
    try {
      const refund = !inPlay ? Number(mySeat.bet_chips) || 0 : 0;
      const next = seats.map((s) => {
        if (s.seat_id !== mySeat.seat_id) return s;
        if (inPlay) return { ...s, status: "disconnected" };
        return {
          ...s,
          user_id: "",
          user_name: "",
          bet_chips: 0,
          cards: [],
          hand_value: 0,
          status: "empty",
          payout_flag: "PENDING",
          payout_claimed: false,
        };
      });
      const nextHost =
        table.host_user_id === user.id
          ? next.find((s) => s.user_id)?.user_id || ""
          : table.host_user_id;
      await patch({ seats: next, host_user_id: nextHost, last_action_timestamp: Date.now() });

      if (refund > 0) {
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
      toast.success(inPlay ? "You're out of this round — your hand stands." : "You left the table.");
    } finally {
      setBusy(false);
    }
  };

  const placeBet = async (amount) => {
    if (busy || !mySeat || !table || status !== "waiting_for_bets") return;
    const wager = Math.max(MIN_BET, Math.min(MAX_BET, Math.round(Number(amount) || MIN_BET)));
    setBusy(true);
    try {
      const fresh = await base44.auth.me();
      const balance = Number(fresh?.casinoChips) || 0;
      if (balance < wager) {
        toast.error("Not enough chips for that wager.");
        return;
      }
      await base44.auth.updateMe({ casinoChips: balance - wager });
      await onUserUpdate?.();
      logChipMovement({
        user,
        action_type: "bet",
        amount: -wager,
        balance_after: balance - wager,
        detail: `Multiplayer Blackjack bet ${wager}`,
      });
      await patch({
        seats: seats.map((s) =>
          s.seat_id === mySeat.seat_id ? { ...s, bet_chips: wager, status: "betting" } : s
        ),
        betting_ends_at: table.betting_ends_at || Date.now() + BETTING_MS,
        last_action_timestamp: Date.now(),
      });
      toast.success(`Bet placed: ${wager} chips.`);
    } finally {
      setBusy(false);
    }
  };

  const removeBet = async () => {
    if (busy || !mySeat || !table || status !== "waiting_for_bets" || !mySeat.bet_chips) return;
    setBusy(true);
    try {
      const refund = Number(mySeat.bet_chips) || 0;
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
      await patch({
        seats: seats.map((s) => (s.seat_id === mySeat.seat_id ? { ...s, bet_chips: 0 } : s)),
      });
    } finally {
      setBusy(false);
    }
  };

  const hit = async () => {
    if (!isMyTurn || busy) return;
    setBusy(true);
    try {
      const deck = [...(table.deck || [])];
      const card = deck.pop();
      if (!card) {
        toast.error("The deck ran out — reset the table.");
        return;
      }
      const cards = [...mySeat.cards, card];
      const total = handValue(cards);
      const busted = total > 21;
      const nextSeats = seats.map((s) =>
        s.seat_id === mySeat.seat_id
          ? { ...s, cards, hand_value: total, status: busted ? "busted" : "playing" }
          : s
      );
      const next = nextPlayingSeat(nextSeats, mySeat.seat_id);
      await patch({
        seats: nextSeats,
        deck,
        current_turn_seat: next || 1,
        status: next ? "player_turns" : "dealer_turn",
        last_action_timestamp: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  };

  const stand = async () => {
    if (!isMyTurn || busy) return;
    setBusy(true);
    try {
      const nextSeats = seats.map((s) =>
        s.seat_id === mySeat.seat_id ? { ...s, status: "stood" } : s
      );
      const next = nextPlayingSeat(nextSeats, mySeat.seat_id);
      await patch({
        seats: nextSeats,
        current_turn_seat: next || 1,
        status: next ? "player_turns" : "dealer_turn",
        last_action_timestamp: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  };

  // Emergency unstick — refunds any open wager and restarts the room. It always
  // re-reads the row first, because a finished round takes priority: once the
  // round is completed, settled results stand and no reset is allowed.
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
          return { ...s, cards: [], hand_value: 0, status: "betting", payout_flag: "PUSH" };
        }
        return {
          ...s,
          cards: [],
          hand_value: 0,
          status: s.user_id ? "betting" : "empty",
        };
      });
      await patch({
        seats: next,
        dealer_hand: [],
        deck: [],
        status: "waiting_for_bets",
        current_turn_seat: 1,
        betting_ends_at: 0,
        round_id: newRoundId(),
        last_action_timestamp: Date.now(),
      });
      toast.success("Table reset. Open bets are being returned.");
    } finally {
      setBusy(false);
    }
  };

  // Host handoff: if the sitting host leaves or drops, the lowest remaining seat
  // claims the engine (best-effort — each client only claims for itself).
  const handoffRef = useRef({});
  handoffRef.current = { table, patch, user };
  useEffect(() => {
    const iv = setInterval(() => {
      const { table: t, patch: p, user: u } = handoffRef.current;
      if (!t || !u) return;
      const list = normalizeSeats(t.seats);
      const mine = list.find((s) => s.user_id === u.id);
      if (!mine || mine.status === "disconnected") return;
      const hostSeat = list.find((s) => s.user_id === t.host_user_id);
      if (hostSeat && hostSeat.status !== "disconnected") return;
      const candidate = list.filter((s) => s.user_id && s.status !== "disconnected")[0];
      if (!candidate || candidate.user_id !== u.id) return;
      p({ host_user_id: u.id, last_action_timestamp: Date.now() });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Best-effort: flag this player as away when the tab is closed mid-round, so
  // their hand stops holding up the table.
  useEffect(() => {
    if (!mySeat || !inPlay) return;
    const handler = () => {
      const { table: t, patch: p, user: u } = handoffRef.current;
      if (!t || !u) return;
      p({
        seats: normalizeSeats(t.seats).map((s) =>
          s.user_id === u.id ? { ...s, status: "disconnected" } : s
        ),
      });
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

  const turnName = turnSeat?.user_name || `Seat ${table.current_turn_seat}`;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        className="relative rounded-2xl border border-border p-3 flex flex-col gap-3 overflow-hidden"
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

        <MpDealerPanel cards={table.dealer_hand || []} />

        <div className="flex flex-col gap-2">
          {seats.map((s) => (
            <MpSeatCard
              key={s.seat_id}
              seat={s}
              isMe={s.user_id === user?.id}
              isTurn={status === "player_turns" && table.current_turn_seat === s.seat_id}
              canJoin={canJoin && !s.user_id}
              onJoin={() => joinSeat(s.seat_id)}
            />
          ))}
        </div>

        {!mySeat && (
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
                <button
                  onClick={removeBet}
                  disabled={busy}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-300 hover:text-rose-200 ml-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <MpBetControls
                bet={bet}
                setBet={setBet}
                chips={chips}
                busy={busy}
                onPlace={placeBet}
                onOpenCashier={onOpenCashier}
              />
            )}
          </div>
        )}

        {status === "player_turns" && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-[11px] font-bold text-amber-200/80 tabular-nums">
              {isMyTurn ? `Your turn — ${turnSeconds}s to act` : `${turnName} is playing — ${turnSeconds}s`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={hit}
                disabled={!isMyTurn || busy}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-30 transition"
                style={{ background: "#d4af37" }}
              >
                <Plus className="inline mr-1 w-4 h-4" /> Hit
              </button>
              <button
                onClick={stand}
                disabled={!isMyTurn || busy}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-30 transition"
                style={{ background: "#d4af37" }}
              >
                <Shield className="inline mr-1 w-4 h-4" /> Stand
              </button>
            </div>
          </div>
        )}

        {status === "dealer_turn" && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            The Dealer is playing out the hand…
          </p>
        )}

        {status === "completed" && (
          <p className="text-center text-[11px] font-bold text-amber-200/80">
            Round complete — the next round starts in a moment.
          </p>
        )}

        {canUnstick && (
          <button
            onClick={resetTable}
            disabled={busy}
            className="w-full py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-rose-100 bg-rose-700/50 border border-rose-400/40 hover:bg-rose-700/70 transition disabled:opacity-40"
          >
            <RotateCcw className="inline w-3.5 h-3.5 mr-1" /> Unstick Table &amp; Refund Bets
          </button>
        )}

        {mySeat && (
          <button
            onClick={leaveSeat}
            disabled={busy}
            className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-100/70 border border-white/15 hover:text-emerald-50 transition disabled:opacity-40"
          >
            <LogOut className="inline w-3 h-3 mr-1" /> Leave Table
          </button>
        )}

        <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
          Casual, non-monetary prototype. The table is run by the players' own
          browsers, so turns, timers and payouts are best-effort — a disconnect at
          the wrong moment can leave a result unsettled. Chips wagered stay in your
          balance until the winning seat claims its own payout.
        </p>
      </div>
    </div>
  );
}