import { motion } from "framer-motion";
import { Lock, Swords } from "lucide-react";
import MiniChipIcon from "../MiniChipIcon";
import { secondsLeft, stakeTypeOf, stakeLabel } from "@/lib/beatMyHand";

// A live bet on the Open Board — deliberately loud: gold-lit surface, oversized
// stake figure and a prominent Accept, so it never reads like the muted history.
// `canAfford` is the viewer's own wallet check: a challenge they cannot cover is
// locked shut instead of being accepted into an overdraft.
export default function OpenChallengeCard({ challenge, onAccept, busy, canAfford = true }) {
  const left = secondsLeft(challenge.expires_at);
  const dead = left <= 0;
  const initial = (challenge.creator_name || "P").trim().charAt(0).toUpperCase();
  const stakeType = stakeTypeOf(challenge);
  const locked = !dead && !canAfford;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl px-3.5 py-3"
      style={
        dead
          ? {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }
          : {
              background:
                "linear-gradient(150deg, rgba(212,175,55,0.18) 0%, rgba(8,46,36,0.82) 42%, rgba(4,28,22,0.94) 100%)",
              border: "1px solid rgba(212,175,55,0.5)",
              boxShadow:
                "0 0 0 1px rgba(212,175,55,0.16), 0 10px 26px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
            }
      }
    >
      {!dead && (
        <span
          className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full blur-2xl"
          style={{ background: stakeType === "diamond" ? "rgba(125,211,252,0.28)" : "rgba(212,175,55,0.3)" }}
        />
      )}

      <div className="relative flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black"
          style={{
            background: "linear-gradient(160deg,#fef1c9,#d4af37)",
            color: "#0a1a14",
            boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
          }}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-emerald-50 truncate">
            {challenge.creator_name || "Player"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {stakeType === "diamond" ? (
              <span className="text-base leading-none">💎</span>
            ) : (
              <MiniChipIcon size={17} />
            )}
            <span
              className="text-lg font-black tabular-nums leading-none"
              style={{ color: stakeType === "diamond" ? "#bae6fd" : "#f3d98b" }}
            >
              {challenge.wager}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100/50">
              {stakeType === "diamond" ? "diamond" : "chips"}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-100/45 ml-1">
              <Lock className="w-3 h-3" /> hand locked
            </span>
          </div>
          {locked && (
            <p className="text-[9px] font-bold text-rose-300/90 mt-1">
              Needs {stakeLabel(challenge.wager, stakeType)} to accept
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
              dead
                ? "bg-white/10 text-emerald-100/40"
                : "bg-amber-400/20 text-amber-200 border border-amber-400/40"
            }`}
          >
            {left}s
          </span>
          <button
            onClick={() => onAccept(challenge)}
            disabled={busy || dead || !canAfford}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-30 ${
              canAfford && !dead ? "text-emerald-950" : "text-emerald-100/50"
            }`}
            style={{ background: canAfford && !dead ? "#d4af37" : "rgba(255,255,255,0.12)" }}
          >
            {canAfford ? (
              <>
                <Swords className="inline w-3 h-3 mr-1" /> Beat it
              </>
            ) : (
              <>
                <Lock className="inline w-3 h-3 mr-1" /> Locked
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}