import PlayingCard from "../PlayingCard";
import { payoutFor } from "./mpEngine";
import { Check } from "lucide-react";

const STATUS = {
  empty: { text: "Open", cls: "text-emerald-100/50" },
  betting: { text: "Betting", cls: "text-amber-200/80" },
  playing: { text: "Playing", cls: "text-emerald-200" },
  stood: { text: "Stood", cls: "text-emerald-100/70" },
  busted: { text: "Busted", cls: "text-rose-300" },
  disconnected: { text: "Away", cls: "text-rose-300/80" },
};

const RESULT = {
  WINNER: "bg-amber-400/20 border-amber-400/50 text-amber-200",
  SPLIT: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
  REFUND: "bg-slate-400/20 border-slate-300/40 text-slate-100",
  LOSS: "bg-rose-500/20 border-rose-400/40 text-rose-200",
};

// One seat of the shared PvP table. In simultaneous-play mode every player acts
// at once; opponents' cards stay face-down until the reveal (settling /
// completed). A READY pill shows once a hand is locked in or busted.
export default function MpSeatCard({
  seat,
  isMe,
  canJoin,
  onJoin,
  revealCards = false,
}) {
  const st = STATUS[seat.status] || STATUS.empty;
  const filled = !!seat.user_id;
  const cards = seat.cards || [];
  const showResult = filled && seat.payout_flag && seat.payout_flag !== "PENDING";
  const payout = showResult ? payoutFor(seat.payout_flag, seat.bet_chips, seat.payout_amount) : 0;
  const ready = filled && cards.length > 0 && (seat.ready === true || seat.status === "busted");
  const isActing = seat.status === "playing" && !ready;

  // Your own hand is always face-up. Opponents only reveal at the end of the
  // round so an early bust can never decide the winner prematurely.
  const showFace = isMe || revealCards;

  return (
    <div
      className={`rounded-2xl border p-2.5 transition-all ${
        ready
          ? "border-amber-400/70 bg-amber-400/10"
          : isActing
          ? "border-emerald-400/60 bg-emerald-400/10"
          : filled
          ? "border-white/15 bg-white/5"
          : "border-white/10 bg-emerald-950/30"
      } ${isMe ? "ring-1 ring-amber-400/40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 ${
            ready
              ? "bg-amber-400 text-emerald-950 border-amber-300"
              : "bg-emerald-950/60 border-white/20 text-amber-300"
          }`}
        >
          {seat.seat_id}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-50 truncate">
            {filled ? seat.user_name || "Player" : "Open seat"}
            {isMe && <span className="ml-1 text-[9px] font-black text-amber-300">YOU</span>}
          </p>
          <p className={`text-[10px] font-semibold ${st.cls}`}>
            {st.text}
            {Number(seat.bet_chips) > 0 && (
              <span className="text-amber-200/80"> · bet {seat.bet_chips}</span>
            )}
            {isActing && <span className="text-emerald-200"> · playing</span>}
          </p>
        </div>

        {filled && cards.length > 0 && showFace && (
          <span className="text-sm font-black text-amber-300 tabular-nums">
            {seat.hand_value ?? ""}
          </span>
        )}
        {ready && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-200">
            <Check className="w-2.5 h-2.5" /> Ready
          </span>
        )}
        {!filled && canJoin && (
          <button
            onClick={onJoin}
            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-emerald-950 border border-amber-300 shrink-0"
          >
            Sit
          </button>
        )}
      </div>

      {filled && cards.length > 0 && (
        <div className="flex flex-wrap items-start mt-2" style={{ paddingRight: 16 }}>
          {cards.map((c, i) => (
            <div key={i} style={{ marginRight: -16, position: "relative", zIndex: i + 1 }}>
              <PlayingCard card={c} small isNew zIndex={i + 1} faceDown={!showFace} backOnly={!showFace} />
            </div>
          ))}
        </div>
      )}

      {showResult && (
        <div
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
            RESULT[seat.payout_flag] || RESULT.LOSS
          }`}
        >
          {seat.payout_flag}
          {payout > 0 && <span>· +{payout} chips</span>}
        </div>
      )}
    </div>
  );
}