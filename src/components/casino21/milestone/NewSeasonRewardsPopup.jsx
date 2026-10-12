import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  RANKS,
  getSeason,
  getMyProgress,
  claimRankReward,
} from "@/lib/milestone";
import MiniChipIcon from "../MiniChipIcon";

const TOKEN_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

function rewardLabel(def) {
  const parts = [];
  if (def.chips) parts.push(`${def.chips} chips`);
  if (def.tokens) parts.push(`${def.tokens} tokens`);
  return parts.join(" + ");
}

// On app launch, if the player has earned-but-unclaimed Rank 1-9 rewards from
// a previous season, show a popup to collect them before starting the new one.
export default function NewSeasonRewardsPopup({ user, onUserUpdate }) {
  const [ranks, setRanks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) return;
      try {
        const season = await getSeason();
        const p = await getMyProgress(
          user.id,
          user.full_name || user.email || "",
          season.season_number
        );
        const pending = Array.isArray(p?.pending_rank_rewards)
          ? p.pending_rank_rewards
          : [];
        // Only ranks not already claimed are collectable here.
        const claimed = Array.isArray(p?.claimed_ranks) ? p.claimed_ranks : [];
        const collectable = pending.filter((r) => !claimed.includes(r));
        if (mounted && collectable.length) {
          setRanks(collectable);
          setOpen(true);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const claimOne = async (rank) => {
    setBusy(true);
    try {
      await claimRankReward(user.id, rank);
      await onUserUpdate?.();
      setRanks((rs) => rs.filter((r) => r !== rank));
      const def = RANKS.find((r) => r.rank === rank);
      toast.success(`Claimed Rank ${rank} reward: ${rewardLabel(def)}!`);
    } catch {
      toast.error("Could not claim reward.");
    } finally {
      setBusy(false);
    }
  };

  const claimAll = async () => {
    setBusy(true);
    try {
      for (const r of [...ranks]) {
        await claimRankReward(user.id, r);
      }
      await onUserUpdate?.();
      setRanks([]);
      toast.success("All rewards claimed! New season begins.");
    } catch {
      toast.error("Could not claim all rewards.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || !ranks.length) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3"
        style={{
          background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.4), 0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col items-center text-center gap-1">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-lg font-black text-amber-200 mt-1">New Season Rewards!</h3>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            A new 🏆RANK season has begun. Collect your unclaimed rank rewards
            from the previous season before you start grinding the new one.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {ranks.map((rank) => {
            const def = RANKS.find((r) => r.rank === rank);
            return (
              <div
                key={rank}
                className="rounded-xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2 flex items-center gap-2"
              >
                <span className="w-7 h-7 rounded-full bg-amber-400/30 text-amber-200 flex items-center justify-center text-xs font-black">
                  {rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-amber-100 leading-tight">
                    {def?.name}
                  </p>
                  <p className="text-[10px] text-emerald-100/60 leading-tight">
                    {rewardLabel(def)}
                  </p>
                </div>
                <button
                  onClick={() => claimOne(rank)}
                  disabled={busy}
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-emerald-950 disabled:opacity-40"
                  style={{ background: "#d4af37" }}
                >
                  Claim
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-100/70 border border-white/15 hover:text-emerald-50 transition"
          >
            Later
          </button>
          <button
            onClick={claimAll}
            disabled={busy}
            className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 transition disabled:opacity-40"
            style={{ background: "#d4af37" }}
          >
            Claim All
          </button>
        </div>
      </div>
    </div>
  );
}