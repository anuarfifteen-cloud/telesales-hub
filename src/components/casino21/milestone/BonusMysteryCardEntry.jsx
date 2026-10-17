import { Lock, Check } from "lucide-react";
import { bonusCardUnlocked } from "@/lib/dailyChallenges";
import { rewardLabel } from "./mysteryCardKit";

// Bonus Mystery Card entry strip for the Daily Missions panel.
// It NEVER opens by itself: the player must tap Claim, and only once every
// daily mission has been claimed. All three states keep the SAME dark
// translucent surface — only the glow and the right-hand action change, so the
// unlocked state never turns into a solid yellow block.
const SHELL = "flex items-center gap-2.5 rounded-[12px] px-2.5 py-2";

export default function BonusMysteryCardEntry({ daily, onOpen }) {
  const missions = Array.isArray(daily?.missions) ? daily.missions : [];
  const total = missions.length || 3;
  const unlocked = bonusCardUnlocked(daily);
  const revealed = daily?.bonus_mystery_card_status === "revealed";
  const claimedCount = missions.filter((m) => m.claimed).length;

  // Claimed — dark and muted, with the perk won today.
  if (revealed) {
    return (
      <div
        className={SHELL}
        style={{ background: "rgba(6,26,26,0.5)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(110,231,183,0.8)" }} />
        <span className="flex flex-col leading-none">
          <span
            className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: "rgba(244,236,216,0.70)" }}
          >
            ✓ Daily Bonus Claimed
          </span>
          <span
            className="mt-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(244,236,216,0.35)" }}
          >
            Resets at Brunei Midnight
          </span>
        </span>
        <span
          className="ml-auto text-[9px] font-black uppercase tracking-widest"
          style={{ color: "rgba(247,215,116,0.75)" }}
        >
          {rewardLabel(daily.bonus_mystery_card_reward)}
        </span>
      </div>
    );
  }

  // Ready — same dark card, slow gold/emerald border glow, compact Claim action.
  if (unlocked) {
    return (
      <div
        className={`${SHELL} bonus-ready-glow`}
        style={{ background: "rgba(6,26,26,0.55)", border: "1px solid rgba(212,175,55,0.35)" }}
      >
        <span className="flex flex-col leading-none">
          <span
            className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: "#f7d774" }}
          >
            🎁 Bonus Reward Ready
          </span>
          <span
            className="mt-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(244,236,216,0.45)" }}
          >
            All {total} daily missions completed!
          </span>
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="ml-auto flex-shrink-0 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition hover:brightness-105 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#d4af37 0%,#fef1c9 100%)",
            color: "#0d2a24",
            boxShadow: "0 3px 10px rgba(212,175,55,0.4)",
          }}
        >
          Claim
        </button>
      </div>
    );
  }

  // Locked — unchanged dark translucent pill with the live progress hint.
  return (
    <div
      className={SHELL}
      style={{ background: "rgba(6,26,26,0.5)", border: "1px dashed rgba(255,255,255,0.16)" }}
    >
      <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(244,236,216,0.45)" }} />
      <span className="flex flex-col leading-none">
        <span
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: "rgba(244,236,216,0.55)" }}
        >
          🃏 Bonus Mystery Card
        </span>
        <span
          className="mt-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(244,236,216,0.35)" }}
        >
          Claim all {total} missions to unlock · {claimedCount}/{total}
        </span>
      </span>
    </div>
  );
}