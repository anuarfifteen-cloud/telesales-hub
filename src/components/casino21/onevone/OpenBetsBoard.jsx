import OpenChallengeCard from "./OpenChallengeCard";
import { canAffordStake, stakeTypeOf } from "@/lib/beatMyHand";

const CARD_STYLE = {
  background:
    "linear-gradient(165deg, rgba(212,175,55,0.13) 0%, rgba(6,38,29,0.62) 58%, rgba(4,26,20,0.78) 100%)",
  border: "1px solid rgba(212,175,55,0.35)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 26px rgba(0,0,0,0.3)",
};

// The live board of open bets — the same panel on the main tab and directly
// under a settled match, so a challenger can take a rematch without leaving.
export default function OpenBetsBoard({
  challenges,
  loading,
  onAccept,
  busy,
  user,
  emptyText = "The Lobby is empty — post a challenge and wait for a taker.",
}) {
  const rows = Array.isArray(challenges) ? challenges : [];

  return (
    <div className="rounded-2xl px-3 py-3 flex flex-col gap-2.5" style={CARD_STYLE}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
          </span>
          Lobby
        </p>
        {rows.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-[9px] font-black tracking-widest text-amber-200 tabular-nums">
            {rows.length} live
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-emerald-100/50 py-4 text-center">Loading the Lobby…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-emerald-100/40 py-4 text-center">{emptyText}</p>
      ) : (
        rows.map((c) => (
          <OpenChallengeCard
            key={c.id}
            challenge={c}
            onAccept={onAccept}
            busy={busy}
            canAfford={canAffordStake(user, stakeTypeOf(c), c.wager)}
          />
        ))
      )}
    </div>
  );
}