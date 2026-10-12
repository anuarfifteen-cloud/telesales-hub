import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { rankDef } from "@/lib/milestone";
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

// Auto-pop popup that appears the moment a new Rank 1-9 milestone is reached.
// The reward is only credited once the player taps Claim.
export default function RankClaimPopup({ claim, onConfirm, onDismiss }) {
  useEffect(() => {
    if (claim) {
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.4 },
          colors: ["#d4af37", "#fef1c9", "#10b981"],
        });
      } catch {}
    }
  }, [claim?.rank]);

  if (!claim) return null;
  const def = rankDef(claim.rank);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-xs rounded-2xl p-5 flex flex-col items-center text-center gap-3"
        style={{
          background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.4), 0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-amber-300" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
            Rank {def.rank} Reached!
          </p>
          <h3 className="text-lg font-black text-amber-200 leading-tight">{def.name}</h3>
        </div>
        <p className="text-xs text-emerald-100/80 leading-relaxed">
          You've earned this season's reward. Tap claim to credit it now — or
          dismiss and claim it later from the 🏆RANK tab.
        </p>

        <div className="w-full rounded-xl border border-amber-400/30 bg-emerald-950/40 py-2.5 flex items-center justify-center gap-2">
          {def.chips > 0 && (
            <>
              <MiniChipIcon size={18} />
              <span className="text-amber-200 font-black text-sm">+{def.chips}</span>
            </>
          )}
          {def.tokens > 0 && (
            <>
              <img src={TOKEN_IMG} alt="token" className="w-4 h-4 object-contain" />
              <span className="text-amber-200 font-black text-sm">+{def.tokens}</span>
            </>
          )}
        </div>

        <div className="w-full flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-100/70 border border-white/15 hover:text-emerald-50 transition"
          >
            Later
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 transition"
            style={{ background: "#d4af37" }}
          >
            Claim Reward
          </button>
        </div>
      </div>
    </div>
  );
}