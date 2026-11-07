import { useState } from "react";
import { Clock, Swords } from "lucide-react";
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

// The two stacked lines of a finished match, worded as a result between two
// colleagues. The winner always sits on top in green, the loser dimmed below.
function resultLines(row) {
  const creator = row.creator_name || "Poster";
  const opponent = row.opponent_name || "Challenger";

  if (row.outcome === "creator_win") {
    return { top: creator, topTone: "text-emerald-300", topIcon: "✓", bottom: opponent };
  }
  if (row.outcome === "opponent_win") {
    return { top: opponent, topTone: "text-emerald-300", topIcon: "✓", bottom: creator };
  }
  if (row.outcome === "push") {
    return { top: `Tie: ${creator}`, topTone: "text-pink-300", topIcon: "", bottom: opponent, bottomTone: "text-pink-200/50" };
  }
  if (row.outcome === "house") {
    return { top: `Both busted: ${creator}`, topTone: "text-rose-300", topIcon: "", bottom: opponent, bottomTone: "text-rose-200/50" };
  }
  return { top: `Expired: ${creator}`, topTone: "text-emerald-100/55", topIcon: "", bottom: opponent, bottomTone: "text-emerald-100/35" };
}

function RecentRow({ row }) {
  const line = resultLines(row);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      {/* Names stack and wrap freely — a long name takes a second line rather
          than being cut off. */}
      <div className="flex flex-col gap-0.5">
        <p
          className={`whitespace-normal break-words text-[12px] font-black leading-snug ${line.topTone}`}
        >
          {line.topIcon && <span className="mr-1">{line.topIcon}</span>}
          {line.top}
        </p>
        <p
          className={`whitespace-normal break-words text-[11px] font-semibold leading-snug ${
            line.bottomTone || "text-emerald-100/35"
          }`}
        >
          {line.bottom}
        </p>
      </div>

      {/* Metadata sits on its own third row, dimmer and smaller. */}
      <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-100/30 tabular-nums">
        {stakeLabel(row.wager, stakeTypeOf(row))} each ·{" "}
        {formatOf(row) === "best_of_3" ? "best of 3" : "single hand"} ·{" "}
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