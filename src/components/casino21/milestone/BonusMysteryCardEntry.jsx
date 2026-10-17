import { Lock, Check, Sparkles } from "lucide-react";
import { bonusCardUnlocked } from "@/lib/dailyChallenges";
import { rewardLabel } from "./mysteryCardKit";

// Bonus Mystery Card entry strip for the Daily Missions panel.
// It NEVER opens by itself: the player must tap it, and only once every daily
// mission has been claimed. Before that it sits locked with live progress.
export default function BonusMysteryCardEntry({ daily, onOpen }) {
  const missions = Array.isArray(daily?.missions) ? daily.missions : [];
  const unlocked = bonusCardUnlocked(daily);
  const revealed = daily?.bonus_mystery_card_status === "revealed";
  const claimedCount = missions.filter((m) => m.claimed).length;

  if (revealed) {
    return (
      <div
        className="flex items-center gap-2 rounded-[12px] px-2.5 py-2"
        style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.35)" }}
      >
        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6ee7b7" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#a7f3d0" }}
        >
          Bonus Card Claimed Today
        </span>
        <span className="ml-auto text-[10px] font-bold" style={{ color: "#f7d774" }}>
          {rewardLabel(daily.bonus_mystery_card_reward)}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!unlocked}
      className="flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-left transition disabled:cursor-not-allowed"
      style={
        unlocked
          ? {
              background: "linear-gradient(135deg,#d4af37 0%,#fef1c9 100%)",
              color: "#0d2a24",
              boxShadow: "0 4px 14px rgba(212,175,55,0.42)",
            }
          : {
              background: "rgba(6,26,26,0.5)",
              border: "1px dashed rgba(255,255,255,0.16)",
            }
      }
    >
      {unlocked ? (
        <Sparkles className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(244,236,216,0.45)" }} />
      )}
      <span className="flex flex-col leading-none">
        <span
          className="text-[11px] font-black uppercase tracking-widest"
          style={unlocked ? undefined : { color: "rgba(244,236,216,0.55)" }}
        >
          🃏 Bonus Mystery Card
        </span>
        <span
          className="mt-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={unlocked ? { color: "rgba(13,42,36,0.75)" } : { color: "rgba(244,236,216,0.35)" }}
        >
          {unlocked
            ? "Tap to claim your extra card"
            : `Claim all ${missions.length} missions to unlock · ${claimedCount}/${missions.length}`}
        </span>
      </span>
      {unlocked && (
        <span className="ml-auto text-[10px] font-black uppercase tracking-widest">Claim</span>
      )}
    </button>
  );
}