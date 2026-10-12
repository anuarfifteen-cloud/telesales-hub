import { useState } from "react";
import { toast } from "sonner";
import { Crown, Trophy, Gem, Lock, Check } from "lucide-react";
import {
  RANKS,
  RANK_10_THRESHOLD,
  rankForScore,
  nextRank,
  rankDef,
  claimRankReward,
  claimDiamond,
} from "@/lib/milestone";
import useMilestoneData from "./useMilestoneData";
import MiniChipIcon from "../MiniChipIcon";

const TOKEN_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

function rewardLabel(def) {
  if (def.rank === 10) return "1 💎 Diamond";
  const parts = [];
  if (def.chips) parts.push(`${def.chips} chips`);
  if (def.tokens) parts.push(`${def.tokens} tokens`);
  return parts.join(" + ");
}

export default function MilestoneProgressionView({ user, onUserUpdate }) {
  const { season, progress, loading, reload } = useMilestoneData(user);
  const [busy, setBusy] = useState(false);

  const score = Number(progress?.score) || 0;
  const claimed = Array.isArray(progress?.claimed_ranks) ? progress.claimed_ranks : [];
  const pending = Array.isArray(progress?.pending_rank_rewards)
    ? progress.pending_rank_rewards
    : [];
  const currentRank = rankForScore(score);
  const nr = nextRank(score);
  const pct = nr
    ? Math.min(
        100,
        Math.round(
          ((score - (RANKS[currentRank - 1]?.threshold || 0)) /
            (nr.threshold - (RANKS[currentRank - 1]?.threshold || 0))) *
            100
        )
      )
    : 100;
  const diamondClaimed = !!season?.diamond_claimed;
  const canClaimDiamond =
    score >= RANK_10_THRESHOLD && !diamondClaimed && season?.status !== "completed";

  const handleClaimRank = async (rank) => {
    if (busy) return;
    setBusy(true);
    try {
      await claimRankReward(user.id, rank);
      await onUserUpdate?.();
      await reload();
      const def = rankDef(rank);
      toast.success(`Rank ${rank} reward claimed: ${rewardLabel(def)}!`);
    } catch {
      toast.error("Could not claim reward. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleClaimDiamond = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await claimDiamond(user.id, user.full_name || user.email || "Player");
      if (res?.claimed) {
        await onUserUpdate?.();
        await reload();
        toast.success("👑 You claimed the Emperor of 21 Diamond! The season has reset.");
      } else if (res?.already) {
        toast.error(
          res.by ? `Already claimed by ${res.by}.` : "Diamond already claimed."
        );
        await reload();
      }
    } catch {
      toast.error("Could not claim the Diamond.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !season) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-200/30 border-t-amber-300 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-3 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-b-2xl"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
          🏆 RANK · MILESTONE PROGRESSION
        </span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-emerald-100/70">
          Season {season.season_number}
        </span>
      </div>

      {/* Score + current rank */}
      <div className="relative rounded-2xl border border-amber-400/30 bg-emerald-950/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
            Season Winning Payouts
          </span>
          {currentRank > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              {rankDef(currentRank).name}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 py-1">
          <MiniChipIcon size={22} />
          <span className="text-2xl font-black text-amber-300 tabular-nums">{score}</span>
        </div>
        {nr ? (
          <>
            <div className="mt-1 h-2 rounded-full bg-emerald-950/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#d4af37,#fef1c9)" }}
              />
            </div>
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/70 mt-1">
              {pct}% to Rank {nr.rank} · {nr.threshold.toLocaleString()} chips
            </p>
          </>
        ) : (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-amber-300 mt-1">
            Max rank reached!
          </p>
        )}
      </div>

      {/* Season notice banner */}
      <div className="relative rounded-xl border border-rose-400/30 bg-rose-950/30 px-3 py-2">
        <p className="text-center text-[11px] font-bold text-rose-200 leading-snug">
          ⚡ Race to Rank 10! The season resets as soon as 1 Diamond is claimed!
        </p>
      </div>

      {/* Diamond status */}
      <div className="relative rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2 flex items-center gap-2">
        <Gem className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] font-bold text-amber-200">Rank 10 Diamond</span>
        <span
          className={`ml-auto text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
            diamondClaimed
              ? "bg-rose-500/30 text-rose-200 border border-rose-400/40"
              : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
          }`}
        >
          {diamondClaimed
            ? `Claimed by ${season.diamond_claimed_by_name || "—"}`
            : "Available"}
        </span>
      </div>

      {/* Rank roadmap */}
      <div className="relative flex flex-col gap-2">
        {RANKS.map((r) => {
          const reached = score >= r.threshold;
          const isClaimed = claimed.includes(r.rank);
          const isPending = pending.includes(r.rank);
          const isCurrent = currentRank === r.rank;
          const isDiamond = r.rank === 10;
          return (
            <div
              key={r.rank}
              className={`rounded-xl border p-2.5 flex items-center gap-2.5 transition-all ${
                isCurrent
                  ? "border-amber-400/60 bg-amber-400/10"
                  : reached || isClaimed
                  ? "border-emerald-400/30 bg-emerald-950/30"
                  : "border-white/10 bg-emerald-950/20 opacity-70"
              }`}
            >
              <div
                className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                  isDiamond
                    ? "bg-gradient-to-br from-amber-300 to-amber-600 text-emerald-950"
                    : reached || isClaimed
                    ? "bg-amber-400/30 text-amber-200"
                    : "bg-emerald-950/60 text-emerald-100/40"
                }`}
              >
                {isDiamond ? <Crown className="w-4 h-4" /> : r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-amber-100 leading-tight">
                  {r.name}
                </p>
                <p className="text-[10px] text-emerald-100/60 leading-tight">
                  {r.threshold.toLocaleString()} chips · {rewardLabel(r)}
                </p>
              </div>
              {isClaimed ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Claimed
                </span>
              ) : isDiamond ? (
                <button
                  onClick={handleClaimDiamond}
                  disabled={busy || !canClaimDiamond}
                  className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-emerald-950 disabled:opacity-40 transition"
                  style={{ background: canClaimDiamond ? "#d4af37" : "#5a5247" }}
                >
                  Claim 💎
                </button>
              ) : isPending ? (
                <button
                  onClick={() => handleClaimRank(r.rank)}
                  disabled={busy}
                  className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-emerald-950 transition disabled:opacity-40"
                  style={{ background: "#d4af37" }}
                >
                  Claim
                </button>
              ) : reached ? (
                <span className="flex-shrink-0 text-[10px] font-bold text-amber-200/70">Ready</span>
              ) : (
                <span className="flex-shrink-0 text-emerald-100/30">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="relative text-[9px] leading-relaxed text-emerald-100/40 text-center">
        Score grows with every winning Blackjack hand this season. Claim each
        rank's reward as you reach it — the first player to 100,000 wins the
        Emperor Diamond and ends the season.
      </p>
    </div>
  );
}