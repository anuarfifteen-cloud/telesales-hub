import { CheckCircle2, Clock4, Coins, RotateCcw, ShieldAlert } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import { grossPayout, horseById } from "@/lib/horseRacing";

const LABELS = {
  pending: { text: "Confirming…", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed: { text: "Bet placed", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lost: { text: "Did not win", tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  won: { text: "Winner — ready to collect", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  claim_pending: { text: "Payout pending", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  paid: { text: "Payout collected", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  refund_pending: { text: "Refund pending", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  refunded: { text: "Refunded", tone: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
  review_required: { text: "Under review", tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

/** Today's bet: what was staked, on which horse, and what can be done next. */
export default function HorseBetCard({ bet, horses, winnerId, resultVisible, busy, onCollect }) {
  const horse = horseById(horses, bet.horse_id);
  const isWinner = resultVisible && bet.horse_id === winnerId;
  const status = isWinner && bet.status === "confirmed" ? "won" : bet.status;
  const meta = LABELS[status] || LABELS.confirmed;
  const canCollect = status === "won" && !busy;
  const payout = Number(bet.gross_payout) || grossPayout(bet.stake);

  return (
    <div className="rounded-2xl border border-border bg-white/95 p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Your bet today
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.bg} ${meta.tone}`}>
          {meta.text}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums text-white"
          style={{ backgroundColor: horse?.color || "#94a3b8" }}
        >
          {horse?.number || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{horse?.name || "Unknown horse"}</p>
          <p className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-muted-foreground">
            <MiniChipIcon size={12} /> {bet.stake} staked · pays {payout}
          </p>
        </div>
      </div>

      {canCollect && (
        <button
          onClick={onCollect}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-[0_2px_10px_rgba(212,175,55,0.4)] transition hover:brightness-105"
        >
          <Coins className="h-3.5 w-3.5" /> Collect {payout} chips
        </button>
      )}

      {status === "paid" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {payout} chips added to your balance
        </p>
      )}

      {status === "claim_pending" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800">
          <Clock4 className="h-3.5 w-3.5" /> Collection was interrupted. An admin will confirm it — don&apos;t
          collect again.
        </p>
      )}

      {status === "review_required" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700">
          <ShieldAlert className="h-3.5 w-3.5" /> Flagged for admin review. Your chips are not lost.
        </p>
      )}

      {status === "refunded" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700">
          <RotateCcw className="h-3.5 w-3.5" /> {bet.stake} chips returned
        </p>
      )}
    </div>
  );
}