import { useState } from "react";
import { Clock, Swords, Trophy } from "lucide-react";
import ChallengeCard from "./ChallengeCard";
import { formatOf, stakeLabel, stakeTypeOf } from "@/lib/beatMyHand";

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

// A finished match read like a battle record: winner on top, a "defeated"
// separator, the loser dimmed below, and the final score held on the right.
// A drawn match (push or double bust) is labelled DRAW with both names neutral.
function matchSummary(row) {
  const creator = row.creator_name || "Poster";
  const opponent = row.opponent_name || "Challenger";
  const isMatch = formatOf(row) === "best_of_3";
  const cScore = Number(row.creator_score) || 0;
  const oScore = Number(row.opponent_score) || 0;
  const cWins = Number(row.creator_hand_wins) || 0;
  const oWins = Number(row.opponent_hand_wins) || 0;
  // Anything over 21 is a bust and reads as such rather than as a number.
  const value = (n) => (n > 21 ? "Bust" : String(n));

  if (row.outcome === "creator_win" || row.outcome === "opponent_win") {
    const creatorWon = row.outcome === "creator_win";
    return {
      label: null,
      winner: creatorWon ? creator : opponent,
      loser: creatorWon ? opponent : creator,
      score: isMatch
        ? `${creatorWon ? cWins : oWins} – ${creatorWon ? oWins : cWins}`
        : `${value(creatorWon ? cScore : oScore)} to ${value(creatorWon ? oScore : cScore)}`,
    };
  }

  if (row.outcome === "push" || row.outcome === "house") {
    return {
      label: "Draw",
      winner: creator,
      loser: opponent,
      score: isMatch ? `${cWins} – ${oWins}` : `${value(cScore)} vs ${value(oScore)}`,
    };
  }

  return { label: "Expired", winner: creator, loser: opponent, score: "—" };
}

function RecentRow({ row }) {
  const match = matchSummary(row);
  const draw = !!match.label;
  const isMatch = formatOf(row) === "best_of_3";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        {/* Winner · separator · loser — names wrap rather than truncate. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p
            className={`whitespace-normal break-words text-[12px] font-black leading-snug ${
              draw ? "text-pink-200/90" : "text-emerald-300"
            }`}
          >
            {match.label ? (
              <span className="mr-1.5 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 align-middle text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/80">
                {match.label}
              </span>
            ) : (
              <Trophy className="mr-1 inline h-3 w-3 -translate-y-0.5" />
            )}
            {match.winner}
          </p>

          <p className="text-[7px] font-black uppercase tracking-[0.35em] text-emerald-100/25">
            {draw ? "tied" : "defeated"}
          </p>

          <p className="whitespace-normal break-words text-[11px] font-semibold leading-snug text-emerald-100/40">
            {match.loser}
          </p>
        </div>

        {/* Final score, held to the right so it scans down the feed. */}
        <div className="shrink-0 text-right">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-300/50">
            {isMatch ? "Hands" : "Final score"}
          </p>
          <p
            className={`mt-0.5 whitespace-nowrap text-[13px] font-black leading-tight tabular-nums ${
              draw ? "text-emerald-100/60" : "text-amber-200"
            }`}
          >
            {match.score}
          </p>
        </div>
      </div>

      {/* Metadata sits on its own bottom row, dimmer and smaller. */}
      <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-100/30 tabular-nums">
        {stakeLabel(row.wager, stakeTypeOf(row))} each ·{" "}
        {isMatch ? "best of 3" : "single hand"} ·{" "}
        {agoLabel(row.settled_at || row.updated_date)}
      </p>
    </div>
  );
}

// Recent = the live feed of finished matches across the whole app.
// History = this player's own settled matches, exactly as before.
export default function BoardFeedTabs({ recent = [], history = [], me, onCollect, onView, busy }) {
  const [tab, setTab] = useState("recent");

  const tabClass = (value) =>
    `flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition ${
      tab === value
        ? "bg-amber-400 text-emerald-950"
        : "bg-white/8 text-emerald-100/60 border border-white/12 hover:bg-white/12"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button onClick={() => setTab("recent")} className={tabClass("recent")}>
          <Clock className="inline w-3 h-3 mr-1 -mt-0.5" /> Recent
        </button>
        <button onClick={() => setTab("history")} className={tabClass("history")}>
          <Swords className="inline w-3 h-3 mr-1 -mt-0.5" /> History
        </button>
      </div>

      {tab === "recent" ? (
        recent.length === 0 ? (
          <p className="py-3 text-center text-[10px] text-emerald-100/35">
            No matches finished yet — the feed fills up as games settle.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {recent.map((row) => (
              <RecentRow key={row.id} row={row} />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <p className="py-3 text-center text-[10px] text-emerald-100/35">
          Your finished matches will show up here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {history.slice(0, 8).map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              me={me}
              variant="result"
              onCollect={onCollect}
              onView={onView}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}