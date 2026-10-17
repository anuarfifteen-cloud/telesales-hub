import { useEffect, useState } from "react";
import { Zap, Flame, Clock, Check, Lock, Trophy, Sparkles, Target } from "lucide-react";
import {
  progressFor,
  isBoostActive,
  boostMsRemaining,
  msUntilBruneiMidnight,
} from "@/lib/dailyChallenges";
import MiniChipIcon from "../MiniChipIcon";
import BonusMysteryCardEntry from "./BonusMysteryCardEntry";

function fmtReset(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}
function fmtBoost(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// Mission objective → its own icon, accent colour and tag. Presentation only —
// progress, targets and rewards all still come from the daily record.
const TYPE_META = {
  play_ranked: { icon: Target, accent: "#38bdf8", tag: "Play" },
  win_ranked: { icon: Trophy, accent: "#34d399", tag: "Win" },
  win_streak: { icon: Flame, accent: "#fb7185", tag: "Streak" },
  blackjacks_ranked: { icon: Sparkles, accent: "#c084fc", tag: "Blackjack" },
};

const SEGMENTS = 10;

// ── One mission ticket ─────────────────────────────────────────────────
// Deliberately unlike a milestone row: a colour-coded ticket with a side
// accent, its own objective icon, a segmented step rail, and a chip reward
// tag — no circular rank badge, no plain list row.
function MissionTicket({ mission, progress, done, onClaim }) {
  const meta = TYPE_META[mission.type] || TYPE_META.play_ranked;
  const Icon = meta.icon;
  const pct = mission.target > 0 ? Math.min(1, progress / mission.target) : 1;
  const filled = done ? SEGMENTS : Math.round(pct * SEGMENTS);
  const accent = meta.accent;

  return (
    <div
      className="relative overflow-hidden rounded-[16px]"
      style={{
        background: done
          ? "linear-gradient(150deg, rgba(52,211,153,0.13) 0%, rgba(6,32,30,0.55) 100%)"
          : "linear-gradient(150deg, rgba(255,255,255,0.05) 0%, rgba(4,26,24,0.55) 100%)",
        border: `1px solid ${done ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.10)"}`,
        boxShadow: done ? "0 0 14px rgba(52,211,153,0.16)" : "none",
      }}
    >
      {/* Left accent rail */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: accent, opacity: done ? 1 : 0.55 }}
      />

      <div className="relative pl-3 pr-3 py-2.5 flex flex-col gap-2">
        {/* Objective icon + tag + chip reward */}
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 flex-shrink-0 rounded-[8px] flex items-center justify-center"
            style={{ background: `${accent}22`, border: `1px solid ${accent}66` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {meta.tag} Mission
          </span>
          <span
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.4)" }}
          >
            <MiniChipIcon size={10} />
            <span className="text-[10px] font-black tabular-nums" style={{ color: "#f7d774" }}>
              +{mission.reward}
            </span>
          </span>
        </div>

        {/* Objective text */}
        <p className="text-[12px] font-bold leading-tight" style={{ color: "#f4ecd8", fontFamily: "Cinzel, serif" }}>
          {mission.label}
        </p>

        {/* Segmented step rail */}
        <div className="flex items-center gap-[3px]">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className="flex-1 rounded-full transition-all duration-300"
              style={{
                height: 5,
                background: i < filled ? accent : "rgba(255,255,255,0.10)",
                boxShadow: i < filled ? `0 0 6px ${accent}66` : "none",
              }}
            />
          ))}
        </div>

        {/* Progress + action */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest tabular-nums" style={{ color: "rgba(244,236,216,0.62)" }}>
            {progress}/{mission.target}
          </span>
          {mission.claimed ? (
            <span
              className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
              style={{ background: "rgba(52,211,153,0.18)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.4)" }}
            >
              <Check className="w-3 h-3" /> Claimed
            </span>
          ) : done ? (
            <button
              onClick={() => onClaim(mission.slot)}
              className="ml-auto text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition hover:brightness-105 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg,#d4af37 0%,#fef1c9 100%)",
                color: "#0d2a24",
                boxShadow: "0 4px 12px rgba(212,175,55,0.4)",
              }}
            >
              Claim +{mission.reward}
            </button>
          ) : (
            <span
              className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
              style={{ color: "rgba(244,236,216,0.35)", border: "1px dashed rgba(255,255,255,0.14)" }}
            >
              <Lock className="w-3 h-3" /> In progress
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailyChallengesHub({ daily, loading, onClaimMission, onOpenBonusCard }) {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading || !daily) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-200/30 border-t-amber-300 animate-spin" />
      </div>
    );
  }

  const boostActive = isBoostActive(daily);
  const missions = Array.isArray(daily.missions) ? daily.missions : [];
  const resetMs = msUntilBruneiMidnight();
  const claimableRewards = missions
    .filter((m) => !m.claimed && progressFor(m.type, daily.counters) >= m.target)
    .reduce((sum, m) => sum + (m.reward || 0), 0);

  return (
    // Its own teal/indigo identity panel — clearly a different family from the
    // gold Rank Milestone roadmap beneath it.
    <div
      className="relative overflow-hidden rounded-[18px]"
      style={{
        background:
          "linear-gradient(150deg, rgba(56,189,248,0.12) 0%, rgba(129,140,248,0.08) 45%, rgba(3,20,20,0.6) 100%)",
        border: "1px solid rgba(56,189,248,0.30)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 22px rgba(0,0,0,0.32)",
      }}
    >
      <div className="relative p-3 flex flex-col gap-2.5">
        {/* Header: lightning badge + title + reset pill */}
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 flex-shrink-0 rounded-[10px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#22d3ee 0%,#6366f1 100%)",
              boxShadow: "0 3px 10px rgba(56,189,248,0.45)",
            }}
          >
            <Zap className="w-4 h-4" style={{ color: "#04222b" }} />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-[12px] font-black uppercase tracking-[0.14em]"
              style={{ color: "#cfeffd", fontFamily: "Cinzel, serif" }}
            >
              Daily Missions
            </span>
            <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(207,239,253,0.5)" }}>
              Ranked tables only
            </span>
          </span>
          <span
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-1"
            style={{ background: "rgba(6,26,26,0.55)", border: "1px solid rgba(56,189,248,0.28)" }}
          >
            <Clock className="w-3 h-3" style={{ color: "#7dd3fc" }} />
            <span className="text-[9px] font-black uppercase tracking-widest tabular-nums" style={{ color: "#7dd3fc" }}>
              {fmtReset(resetMs)}
            </span>
          </span>
        </div>

        {/* Active boost strip */}
        {boostActive && (
          <div
            className="flex items-center gap-2 rounded-[12px] px-2.5 py-1.5"
            style={{
              background: "linear-gradient(90deg, rgba(244,63,94,0.22) 0%, rgba(245,158,11,0.16) 100%)",
              border: "1px solid rgba(244,63,94,0.45)",
            }}
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" style={{ color: "#fda4af" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#fecdd3" }}>
              2× Rank Boost Active
            </span>
            <span className="ml-auto text-[12px] font-black tabular-nums" style={{ color: "#fde68a" }}>
              {fmtBoost(boostMsRemaining(daily))}
            </span>
          </div>
        )}

        {/* Mission tickets */}
        <div className="flex flex-col gap-2">
          {missions.map((m) => (
            <MissionTicket
              key={m.slot}
              mission={m}
              progress={Math.min(progressFor(m.type, daily.counters), m.target)}
              done={progressFor(m.type, daily.counters) >= m.target}
              onClaim={onClaimMission}
            />
          ))}
        </div>

        {/* Bonus Mystery Card — never opens itself. Locked until every daily
            mission has been claimed, then the player taps it to claim. */}
        <BonusMysteryCardEntry daily={daily} onOpen={onOpenBonusCard} />

        {/* Only rendered while rewards are waiting — the old "missions done
            today" line added a whole extra row at the bottom. */}
        {claimableRewards > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            <MiniChipIcon size={10} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#f7d774" }}>
              {claimableRewards} ready to claim
            </span>
          </div>
        )}
      </div>
    </div>
  );
}