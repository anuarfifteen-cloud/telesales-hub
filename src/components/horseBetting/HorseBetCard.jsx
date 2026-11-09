import { CheckCircle2, Clock4, Coins, ShieldAlert, Trophy } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import { grossPayout, horseById, rewardForPlace } from "@/lib/horseRacing";
import { ordinal, placeOf } from "@/lib/derbyFinish";
import RacerSprite from "./RacerSprite";

const LABELS = {
  pending: { text: "Confirming…", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed: { text: "Bet placed", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lost: { text: "Did not win", tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  claim_pending: { text: "Payout pending", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  paid: { text: "Collected", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  refund_pending: { text: "Refund pending", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  refunded: { text: "Refunded", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  review_required: { text: "Under review", tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

const TIER = {
  1: "bg-amber-50 text-amber-900 border-amber-300",
  2: "bg-emerald-50 text-emerald-800 border-emerald-300",
  3: "bg-sky-50 text-sky-800 border-sky-300",
};

function resultText(place, stake, payout) {
  if (place === 1) return `Winner! • Paid ${payout} chips`;
  if (place === 2) return `Finished 2nd • 100% Refunded (+${Number(stake) || 0} chips)`;
  if (place === 3) return `Finished 3rd • 50% Refunded (+${Math.floor((Number(stake) || 0) / 2)} chips)`;
  return `Finished ${ordinal(place)} • Did not win`;
}

/** Today's bet: what was staked, where it finished, and the reward to collect. */
export default function HorseBetCard({ bet, horses, winnerId, resultVisible, busy, onCollect }) {
  const horse = horseById(horses, bet.horse_id);
  const payout = Number(bet.gross_payout) || grossPayout(bet.stake);
  const place = resultVisible ? placeOf(horses, winnerId, bet.horse_id) : 0;
  const reward = place ? Number(bet.reward_amount) || rewardForPlace(place, bet.stake) : 0;

  const collected = bet.status === "paid" || bet.status === "refunded";
  const pendingClaim = bet.status === "claim_pending" || bet.status === "refund_pending";
  const canCollect =
    place > 0 && place <= 3 && reward > 0 && !collected && !pendingClaim && bet.status !== "review_required" && !busy;

  const meta = LABELS[bet.status] || LABELS.confirmed;
  const pill = pendingClaim
    ? LABELS[bet.status]
    : collected
      ? (LABELS[bet.status] || LABELS.paid)
      : place > 0
        ? place <= 3
          ? { text: "Ready to collect", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" }
          : LABELS.lost
        : meta;

  return (
    <div className="rounded-2xl border border-border bg-white/95 p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Your bet today
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${pill.bg} ${pill.tone}`}
        >
          {pill.text}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <span
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5"
          style={{ background: "linear-gradient(160deg,#eef7f1 0%,#dbeade 100%)" }}
        >
          <RacerSprite horseId={horse?.id} size={44} frame={0} />
          <span
            className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md text-[9px] font-black text-white"
            style={{ backgroundColor: horse?.color || "#94a3b8" }}
          >
            {horse?.number || "?"}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{horse?.name || "Unknown horse"}</p>
          <p className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-muted-foreground">
            <MiniChipIcon size={12} /> {bet.stake} staked · 1st pays {payout}
          </p>
        </div>
      </div>

      {place > 0 && (
        <p
          className={`mt-2.5 flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-black leading-snug ${
            TIER[place] || "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {place === 1 && <Trophy className="h-3.5 w-3.5 shrink-0" />}
          <span className="min-w-0">{resultText(place, bet.stake, payout)}</span>
        </p>
      )}

      {canCollect && (
        <button
          onClick={onCollect}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-[0_2px_10px_rgba(212,175,55,0.4)] transition hover:brightness-105"
        >
          <Coins className="h-3.5 w-3.5" /> Collect {reward} chips
        </button>
      )}

      {collected && reward > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {reward} chips added to your balance
        </p>
      )}

      {pendingClaim && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800">
          <Clock4 className="h-3.5 w-3.5" /> Collection was interrupted. An admin will confirm it — don&apos;t
          collect again.
        </p>
      )}

      {bet.status === "review_required" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700">
          <ShieldAlert className="h-3.5 w-3.5" /> Flagged for admin review. Your chips are not lost.
        </p>
      )}
    </div>
  );
}