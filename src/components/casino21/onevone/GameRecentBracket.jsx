import { Swords, Trophy } from "lucide-react";
import { formatOf, stakeLabel, stakeTypeOf } from "@/lib/beatMyHand";
import { useUserMap } from "@/hooks/useUserMap";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { toast } from "@/components/ui/use-toast";

// How long ago a match settled, in the plainest unit.
function agoLabel(iso) {
  const then = Date.parse(iso) || 0;
  if (!then) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Which side took the match: "creator" | "opponent" | null (push / house).
function winnerSide(row) {
  if (row.outcome === "creator_win") return "creator";
  if (row.outcome === "opponent_win") return "opponent";
  return null;
}

// A fighter's total on the bracket: hand wins on a Best of 3, the hand itself
// on a single-hand match.
function scoreFor(row, side) {
  if (formatOf(row) === "best_of_3") {
    return Number(side === "creator" ? row.creator_hand_wins : row.opponent_hand_wins) || 0;
  }
  return Number(side === "creator" ? row.creator_score : row.opponent_score) || 0;
}

// Circular profile picture (or the member's initials) that reveals the full
// name when tapped. The trophy slot is always reserved on both sides, so a
// winning score never shifts the row out of symmetry.
function Fighter({ profile, fallbackName, score, isWinner, isDraw, side, onAvatarTap }) {
  const avatar = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAvatarTap();
      }}
      aria-label={`Show ${fallbackName}'s name`}
      className="rounded-full transition active:scale-95 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
    >
      <ProfileAvatar user={profile || { full_name: fallbackName }} size="sm" />
    </button>
  );

  const trophy = (
    <Trophy
      className={`w-3 h-3 shrink-0 ${isWinner ? "text-amber-300" : "invisible"}`}
      aria-hidden={!isWinner}
    />
  );

  const points = (
    <span
      className={`text-lg font-black tabular-nums leading-none ${
        isWinner ? "text-amber-300" : isDraw ? "text-emerald-100/70" : "text-emerald-100/35"
      }`}
    >
      {score}
    </span>
  );

  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${
        side === "creator" ? "justify-end" : "justify-start"
      }`}
    >
      {side === "creator" ? (
        <>
          {avatar}
          {trophy}
          {points}
        </>
      ) : (
        <>
          {points}
          {trophy}
          {avatar}
        </>
      )}
    </div>
  );
}

// One finished match as a fight-bracket tile: the two fighters face each other
// across a VS medallion — avatar, score, VS, score, avatar — the winner lit
// gold, the loser dimmed, with a tail of match detail underneath.
function MatchTile({ row, index, profiles, onView }) {
  const win = winnerSide(row);
  const draw = !win;
  const isMatch = formatOf(row) === "best_of_3";

  const creatorName = row.creator_name || "Poster";
  const opponentName = row.opponent_name || "Challenger";
  const creatorProfile = profiles[row.creator_id];
  const opponentProfile = profiles[row.opponent_id];

  const showName = (profile, fallback) => {
    toast({
      title: profile?.full_name || fallback,
      description: "Beat My Hand",
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView?.(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView?.(row);
        }
      }}
      className="relative w-full text-left rounded-xl overflow-hidden border transition hover:brightness-110 cursor-pointer"
      style={{
        borderColor: "rgba(212,175,55,0.3)",
        background:
          "linear-gradient(120deg, rgba(212,175,55,0.10) 0%, rgba(6,38,29,0.72) 46%, rgba(4,26,20,0.86) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.28)",
      }}
    >
      {/* Bracket round tag */}
      <span className="absolute -top-px left-2 px-1.5 py-0.5 rounded-b-md bg-amber-400/15 border border-t-0 border-amber-400/30 text-[8px] font-black uppercase tracking-[0.2em] text-amber-200/80 tabular-nums">
        Match {index + 1}
      </span>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-2.5 pt-4 pb-1.5">
        <Fighter
          side="creator"
          profile={creatorProfile}
          fallbackName={creatorName}
          score={scoreFor(row, "creator")}
          isWinner={win === "creator"}
          isDraw={draw}
          onAvatarTap={() => showName(creatorProfile, creatorName)}
        />

        {/* Central medallion with the bracket line through it */}
        <div className="relative flex flex-col items-center justify-center px-1">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-amber-400/40 via-amber-300/70 to-amber-400/40" />
          <span
            className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-[9px] font-black uppercase tracking-widest"
            style={{
              background: "#070f0c",
              border: "1px solid rgba(212,175,55,0.55)",
              color: "#f0cf72",
            }}
          >
            {draw ? "—" : "VS"}
          </span>
        </div>

        <Fighter
          side="opponent"
          profile={opponentProfile}
          fallbackName={opponentName}
          score={scoreFor(row, "opponent")}
          isWinner={win === "opponent"}
          isDraw={draw}
          onAvatarTap={() => showName(opponentProfile, opponentName)}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-100/40 tabular-nums">
          {isMatch ? "Best of 3 · hands won" : "Single hand"} ·{" "}
          {stakeLabel(row.wager, stakeTypeOf(row))}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-100/30 tabular-nums">
          {row.outcome === "house" ? "Both busted" : row.outcome === "push" ? "Push" : ""}{" "}
          {agoLabel(row.settled_at || row.updated_date)}
        </span>
      </div>
    </div>
  );
}

// The last five matches settled anywhere in the app, stacked as a bracket.
export default function GameRecentBracket({ matches = [], onView }) {
  const rows = (Array.isArray(matches) ? matches : []).slice(0, 5);
  // Same public profile records the leaderboards use, so photos and initials
  // match everywhere in the app.
  const profiles = useUserMap();

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-2 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">
          <Swords className="w-3 h-3" /> Game Recent
        </p>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/35 tabular-nums">
          Last 5
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-3 text-center text-[10px] text-emerald-100/35">
          No matches settled yet — the bracket fills up as games end.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div key={row.id} className="relative">
              {/* Bracket connector between rounds */}
              {i > 0 && (
                <div className="flex justify-center">
                  <span className="w-px h-2.5 bg-amber-400/30" />
                </div>
              )}
              <MatchTile row={row} index={i} profiles={profiles} onView={onView} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}