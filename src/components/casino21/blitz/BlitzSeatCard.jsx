import { Crown, Zap } from "lucide-react";
import { ENTRY_FEE } from "./blitzEngine";

const STATUS_CLS = {
  empty: "text-emerald-100/40",
  betting: "text-amber-200/80",
  playing: "text-emerald-200",
  stood: "text-emerald-100/60",
  busted: "text-rose-300",
  disconnected: "text-rose-300/80",
};

const RESULT_CLS = {
  WINNER: "bg-amber-400/20 border-amber-400/50 text-amber-200",
  SPLIT: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
  LOSS: "bg-rose-500/20 border-rose-400/40 text-rose-200",
  REFUND: "bg-slate-400/20 border-slate-300/40 text-slate-100",
};

// One seat of the Blitz tournament. Shows the player name, entry-fee status
// (during seating), live Blitz chip score (during play), and payout result
// (when completed). Cards are NOT shown here — each player's hand is local.
export default function BlitzSeatCard({
  seat,
  isMe,
  isHostSeat,
  canJoin,
  onJoin,
  showScore,
  showResult,
}) {
  const filled = !!seat.user_id;
  const paid = Number(seat.bet_chips) >= ENTRY_FEE;
  const score = Number(seat.blitz_score) || 0;
  const eliminated = showScore && filled && score <= 0;
  const stCls = STATUS_CLS[seat.status] || STATUS_CLS.empty;
  const hasResult = showResult && filled && seat.payout_flag && seat.payout_flag !== "PENDING";

  return (
    <div
      className={`rounded-2xl border p-2.5 transition-all ${
        hasResult && seat.payout_flag === "WINNER"
          ? "border-amber-400/70 bg-amber-400/10"
          : hasResult && seat.payout_flag === "SPLIT"
          ? "border-emerald-400/60 bg-emerald-400/10"
          : isMe
          ? "border-amber-400/40 bg-white/5 ring-1 ring-amber-400/30"
          : filled
          ? "border-white/15 bg-white/5"
          : "border-white/10 bg-emerald-950/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 ${
            paid || (showScore && score > 0)
              ? "bg-amber-400 text-emerald-950 border-amber-300"
              : "bg-emerald-950/60 border-white/20 text-amber-300"
          }`}
        >
          {seat.seat_id}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-50 truncate">
            {filled ? seat.user_name || "Player" : "Open seat"}
            {isHostSeat && <span className="ml-1 text-[9px] font-black text-amber-300">(HOST)</span>}
            {isMe && <span className="ml-1 text-[9px] font-black text-amber-300">YOU</span>}
          </p>
          <p className={`text-[10px] font-semibold ${stCls}`}>
            {eliminated
              ? "Eliminated"
              : !filled
              ? "Open"
              : seat.status === "betting" && !paid
              ? "Waiting for entry fee"
              : seat.status === "betting"
              ? "Entry paid"
              : seat.status === "disconnected"
              ? "Away"
              : showScore
              ? `${score} Blitz Chips`
              : "Ready"}
          </p>
        </div>

        {/* Live score badge during play */}
        {showScore && filled && !eliminated && !hasResult && score > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-black text-emerald-200 tabular-nums shrink-0">
            <Zap className="w-2.5 h-2.5" /> {score}
          </span>
        )}

        {/* Result badge when completed */}
        {hasResult && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shrink-0 ${
              RESULT_CLS[seat.payout_flag] || RESULT_CLS.LOSS
            }`}
          >
            {seat.payout_flag === "WINNER" && <Crown className="w-2.5 h-2.5" />}
            {seat.payout_flag}
            {Number(seat.payout_amount) > 0 && <span>· +{seat.payout_amount}</span>}
          </span>
        )}

        {/* Join button during seating */}
        {!filled && canJoin && (
          <button
            onClick={onJoin}
            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-emerald-950 border border-amber-300 shrink-0"
          >
            Sit
          </button>
        )}
      </div>
    </div>
  );
}