import { motion } from "framer-motion";
import { Lock, Swords } from "lucide-react";
import MiniChipIcon from "../MiniChipIcon";
import { outcomeLine, secondsLeft } from "@/lib/beatMyHand";

// One row on the board. `variant`:
//   "board"  → someone else's open challenge, with Accept
//   "mine"   → your own open challenge, score visible, waiting
//   "result" → a settled/expired challenge you were part of
export default function ChallengeCard({ challenge, me, variant, onAccept, onCollect, busy }) {
  const isCreator = challenge.creator_id === me;
  const myPayout = Number(isCreator ? challenge.creator_payout : challenge.opponent_payout) || 0;
  const myClaimed = isCreator ? !!challenge.creator_claimed : !!challenge.opponent_claimed;
  const left = secondsLeft(challenge.expires_at);

  const myScore = isCreator ? challenge.creator_score : challenge.opponent_score;
  const theirScore = isCreator ? challenge.opponent_score : challenge.creator_score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-50 truncate">
            {variant === "board" ? challenge.creator_name || "Player" : isCreator ? "Your challenge" : challenge.creator_name || "Player"}
          </span>
          {variant === "board" && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-[8px] font-black uppercase tracking-widest text-amber-300">
              {left}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <MiniChipIcon size={11} />
          <span className="text-[11px] font-bold text-amber-200 tabular-nums">{challenge.wager}</span>
          <span className="text-[10px] text-emerald-100/50">wager</span>

          {variant === "board" ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-100/50">
              <Lock className="w-3 h-3" /> hand locked
            </span>
          ) : variant === "mine" ? (
            <span className="text-[10px] text-emerald-100/60">your hand: {myScore}</span>
          ) : (
            <span className="text-[10px] text-emerald-100/60 tabular-nums">
              you {myScore ?? "—"} · them {theirScore ?? "—"}
            </span>
          )}
        </div>

        {variant === "result" && (
          <p className={`text-[10px] mt-0.5 font-semibold ${
            myPayout > 0 ? "text-emerald-300" : challenge.outcome === "expired" ? "text-amber-300" : "text-emerald-100/50"
          }`}>
            {outcomeLine(challenge, isCreator)}
            {myPayout > 0 && ` · ${myPayout} chips`}
          </p>
        )}
      </div>

      {variant === "board" && (
        <button
          onClick={() => onAccept(challenge)}
          disabled={busy || left <= 0}
          className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          <Swords className="inline w-3 h-3 mr-1" /> Accept
        </button>
      )}

      {variant === "mine" && (
        <span className="text-[10px] font-bold text-emerald-100/40 tabular-nums">{left}s left</span>
      )}

      {variant === "result" && myPayout > 0 && !myClaimed && (
        <button
          onClick={() => onCollect(challenge)}
          disabled={busy}
          className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          Collect
        </button>
      )}

      {variant === "result" && (myClaimed || myPayout <= 0) && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/30">
          {myClaimed ? "Paid" : "Lost"}
        </span>
      )}
    </motion.div>
  );
}