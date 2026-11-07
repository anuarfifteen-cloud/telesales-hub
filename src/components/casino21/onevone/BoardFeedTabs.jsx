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

// One line per finished match, worded as a result between two colleagues.
function resultLine(row) {
  const creator = row.creator_name || "Poster";
  const opponent = row.opponent_name || "Challenger";
  if (row.outcome === "creator_win") return { text: `${creator} beat ${opponent}`, tone: "text-emerald-300" };
  if (row.outcome === "opponent_win") return { text: `${opponent} beat ${creator}`, tone: "text-emerald-300" };
  if (row.outcome === "push") return { text: `${creator} tied ${opponent}`, tone: "text-amber-300" };
  if (row.outcome === "house") return { text: `${creator} vs ${opponent} — both busted`, tone: "text-rose-300" };
  return { text: `${creator} vs ${opponent} — expired`, tone: "text-emerald-100/50" };
}

function RecentRow({ row }) {
  const line = resultLine(row);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold truncate ${line.tone}`}>{line.text}</p>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-emerald-100/35 tabular-nums">
          {agoLabel(row.settled_at || row.updated_date)}
        </span>
      </div>
      <p className="mt-0.5 text-[9px] uppercase tracking-widest text-emerald-100/40 tabular-nums">
        {stakeLabel(row.wager, stakeTypeOf(row))} each ·{" "}
        {formatOf(row) === "best_of_3" ? "best of 3" : "single hand"}
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