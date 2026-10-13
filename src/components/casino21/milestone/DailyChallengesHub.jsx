import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Gift, Flame, Clock, Check, Lock } from "lucide-react";
import {
  progressFor,
  isBoostActive,
  boostMsRemaining,
  msUntilBruneiMidnight,
} from "@/lib/dailyChallenges";
import MiniChipIcon from "../MiniChipIcon";

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

function MysteryCard({ card, onReveal, busy }) {
  const revealed = !!card?.revealed;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-28 h-40 cursor-pointer"
        style={{ perspective: 800 }}
        onClick={() => !revealed && !busy && onReveal()}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Back — tap to reveal */}
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center text-center p-2"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(135deg, #3b1d2e 0%, #1a0f1c 100%)",
              border: "1.5px solid rgba(212,175,55,0.5)",
              boxShadow: "inset 0 0 18px rgba(212,175,55,0.18)",
            }}
          >
            <span className="text-2xl">🃏</span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-300/80">
              Tap to Reveal
            </span>
          </div>
          {/* Face */}
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center text-center p-2"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                card?.type === "rank_surge"
                  ? "linear-gradient(135deg, #7c2d12 0%, #431407 100%)"
                  : "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
              border: "1.5px solid rgba(212,175,55,0.6)",
              boxShadow: "0 0 18px rgba(212,175,55,0.25)",
            }}
          >
            <span className="text-2xl">
              {card?.type === "rank_surge" ? "🔥" : card?.type === "lucky_break" ? "🎁" : "🎯"}
            </span>
            <span className="mt-1 text-[11px] font-black uppercase tracking-wider text-amber-300 leading-tight">
              {card?.label || "Mystery"}
            </span>
            <span className="mt-0.5 text-[9px] font-bold text-emerald-100/80 leading-tight">
              {card?.desc}
            </span>
          </div>
        </motion.div>
      </div>
      {!revealed && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-200/60">
          1 free reveal / day
        </p>
      )}
    </div>
  );
}

export default function DailyChallengesHub({
  daily,
  loading,
  onRevealCard,
  onClaimMission,
  onClaimCard,
}) {
  const [now, setNow] = useState(Date.now());
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
  const card = daily.mystery_card || {};
  const cardDone =
    card.revealed &&
    !card.claimed &&
    card.target > 0 &&
    progressFor(card.type, daily.counters) >= card.target;
  const resetMs = msUntilBruneiMidnight();

  return (
    <div className="relative flex flex-col gap-2.5">
      {/* Header + reset countdown */}
      <div className="relative flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
          ⚡ Daily Challenges
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/70 bg-emerald-950/40 border border-amber-400/30 rounded-full px-2 py-1">
          <Clock className="w-3 h-3" /> Resets in {fmtReset(resetMs)}
        </span>
      </div>

      {/* Active boost banner */}
      {boostActive && (
        <div className="relative rounded-xl border border-rose-400/50 bg-gradient-to-r from-rose-950/50 to-amber-950/40 px-3 py-2 flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-300 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
            🔥 2× Rank Boost Active
          </span>
          <span className="ml-auto text-sm font-black text-amber-300 tabular-nums">
            {fmtBoost(boostMsRemaining(daily))}
          </span>
        </div>
      )}

      {/* Ranked-only notice */}
      <div className="relative rounded-xl border border-amber-400/30 bg-emerald-950/30 px-3 py-1.5">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
          ⚡ Daily Missions & Mystery Cards only progress on Ranked tables!
        </p>
      </div>

      {/* Mystery card slot */}
      <div className="relative rounded-2xl border border-amber-400/25 bg-emerald-950/30 p-3 flex flex-col items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">
          🃏 Mystery Card of the Day
        </span>
        <MysteryCard card={card} onReveal={onRevealCard} />
        {card.revealed && card.target > 0 && !card.claimed && (
          <button
            onClick={onClaimCard}
            disabled={!cardDone}
            className={`w-full max-w-[12rem] py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition disabled:opacity-40 ${
              cardDone ? "text-emerald-950" : "text-emerald-100/60"
            }`}
            style={{ background: cardDone ? "#d4af37" : "rgba(255,255,255,0.08)" }}
          >
            {cardDone ? (
              <span className="flex items-center justify-center gap-1">
                <Gift className="w-3.5 h-3.5" /> Claim {card.reward} Chips
              </span>
            ) : (
              `${Math.min(progressFor(card.type, daily.counters), card.target)}/${card.target}`
            )}
          </button>
        )}
        {card.revealed && card.claimed && card.type !== "rank_surge" && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
            <Check className="w-3 h-3" /> Reward claimed
          </span>
        )}
        {card.revealed && card.type === "rank_surge" && (
          <span className="text-[10px] font-bold text-rose-200">
            Boost active — win Ranked hands for 2× score!
          </span>
        )}
      </div>

      {/* 3 mission cards */}
      <div className="relative flex flex-col gap-2">
        {missions.map((m) => {
          const prog = Math.min(progressFor(m.type, daily.counters), m.target);
          const done = prog >= m.target;
          const pct = m.target > 0 ? Math.round((prog / m.target) * 100) : 100;
          return (
            <div
              key={m.slot}
              className="rounded-xl border border-amber-400/20 bg-emerald-950/30 p-2.5 flex items-center gap-2.5"
            >
              <div
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                  m.claimed
                    ? "bg-emerald-500/30 text-emerald-200"
                    : done
                    ? "bg-amber-400/30 text-amber-200"
                    : "bg-emerald-950/60 text-emerald-100/40"
                }`}
              >
                {m.claimed ? <Check className="w-4 h-4" /> : m.slot}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-100 leading-tight truncate">{m.label}</p>
                <div className="mt-1 h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,#d4af37,#fef1c9)" }}
                  />
                </div>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200/60">
                  {prog}/{m.target} · <MiniChipIcon size={9} className="inline -mt-0.5" /> {m.reward} chips
                </p>
              </div>
              {m.claimed ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Done
                </span>
              ) : done ? (
                <button
                  onClick={() => onClaimMission(m.slot)}
                  className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-emerald-950"
                  style={{ background: "#d4af37" }}
                >
                  Claim
                </button>
              ) : (
                <span className="flex-shrink-0 text-emerald-100/30">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}