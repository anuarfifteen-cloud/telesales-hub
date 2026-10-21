import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag, PlayCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getSeason, endSeason, startNewSeason, isOffSeason } from "@/lib/milestone";
import { finalizeStreakAward } from "@/lib/milestoneStreak";
import { monthLabel } from "@/lib/seasonWindow";
import AdminStreakRebuild from "./AdminStreakRebuild";

// Admin "Milestone Season Control": live season status plus the two manual
// overrides — force the season to end, or start a fresh one immediately.
export default function AdminMilestoneSeasonControl() {
  const [season, setSeason] = useState(null);
  const [leader, setLeader] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);

  const reload = async () => {
    try {
      const s = await getSeason();
      setSeason(s);
      const page = await base44.entities.MilestoneProgress.filter(
        { season_number: s.season_number },
        { sort: "-score", limit: 1 }
      );
      const rows = page.items || page || [];
      setLeader(rows[0] || null);
      const hp = await base44.entities.MilestoneSeasonHistory.filter(
        {},
        { sort: "-season_number", limit: 5 }
      );
      setHistory(hp.items || hp || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    reload();
    const unsub = base44?.entities?.MilestoneSeason?.subscribe?.(() => reload());
    const unsub2 = base44?.entities?.MilestoneProgress?.subscribe?.(() => reload());
    return () => {
      unsub && unsub();
      unsub2 && unsub2();
    };
  }, []);

  const handleForceEnd = async () => {
    if (!season) return;
    setBusy(true);
    try {
      const updated = await endSeason(season, {
        winnerId: leader?.user_id || "",
        winnerName: leader?.user_name || "",
      });
      // Close the season's history row: champion, closing date and summary,
      // plus the season's highest Ranked streak for the record.
      try {
        await finalizeStreakAward(Number(season.season_number), {
          id: leader?.user_id || "",
          name: leader?.user_name || "",
        });
      } catch {
        /* best-effort — the season is already closed */
      }
      setSeason(updated || (await getSeason()));
      await reload();
      toast.success("Season ended. Ranked is locked until the 1st of next month.");
    } catch {
      toast.error("Could not end the season.");
    } finally {
      setBusy(false);
      setConfirmEnd(false);
    }
  };

  const handleForceStart = async () => {
    if (!season) return;
    setBusy(true);
    try {
      const updated = await startNewSeason(season);
      setSeason(updated || (await getSeason()));
      await reload();
      toast.success("New season started. Ranked is open again.");
    } catch {
      toast.error("Could not start the new season.");
    } finally {
      setBusy(false);
      setConfirmStart(false);
    }
  };

  if (!season) {
    return (
      <div className="bg-white rounded-2xl border border-border p-5" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
        <p className="text-sm text-slate-500">Loading milestone season…</p>
      </div>
    );
  }

  const off = isOffSeason(season);
  const month = season.season_month || "";
  const champion =
    season.season_winner_name || season.diamond_claimed_by_name || leader?.user_name || "";

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🏆 Milestone Season Control</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage the Blackjack 🏆RANK season — end it early to pause Ranked, or start the next one
          without waiting for the month to turn.
        </p>
      </div>

      {/* Status indicator */}
      <div
        className={`rounded-xl border px-3 py-2.5 text-center ${
          off
            ? "border-rose-200 bg-rose-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <p className={`text-sm font-black ${off ? "text-rose-700" : "text-emerald-700"}`}>
          {off ? "🔴 OFF-SEASON (Ended)" : `🟢 ACTIVE (Season ${month || season.season_number})`}
        </p>
        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
          {off
            ? "Ranked play is locked until the 1st of next month at Brunei Midnight."
            : month
            ? `${monthLabel(month)} season in progress · Ranked is open.`
            : "Season in progress · Ranked is open."}
        </p>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Leading</p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {leader ? leader.user_name || "—" : "—"}
          </p>
          <p className="text-[10px] text-slate-500">
            {leader ? `${Number(leader.score || 0).toLocaleString()} chips` : "No scores yet"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {off ? "Champion" : "💎 Diamond"}
          </p>
          <p className={`text-xs font-bold ${off ? "text-slate-900" : season.diamond_claimed ? "text-rose-600" : "text-emerald-600"}`}>
            {off
              ? champion || "—"
              : season.diamond_claimed
              ? `Claimed by ${season.diamond_claimed_by_name || "—"}`
              : "Available"}
          </p>
        </div>
      </div>

      {/* Season history — both winners of every closed season */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2.5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Season History
          </p>
          {history.map((h) => {
            const wins = Number(h.streak_wins) || 0;
            return (
              <div key={h.id} className="text-[11px] leading-snug">
                <p className="font-bold text-slate-900">
                  Season {h.season_number} · 🏆 {h.champion_name || "—"}
                </p>
                {wins > 0 ? (
                  <p className="text-slate-600">
                    🔥 Highest streak: {h.streak_winner_name || "—"} — {wins} Wins
                  </p>
                ) : (
                  <p className="text-slate-500">
                    🔥 No Ranked win streak recorded this season.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rebuild every player's best Ranked streak from saved hand history */}
      <AdminStreakRebuild />

      {/* Force end */}
      <button
        onClick={() => setConfirmEnd(true)}
        disabled={busy || off}
        className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Flag className="w-4 h-4" /> ⚠️ Force End Season
      </button>

      {/* Force start */}
      <button
        onClick={() => setConfirmStart(true)}
        disabled={busy}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <PlayCircle className="w-4 h-4" /> ⚡ Force Start New Season Now
      </button>

      {confirmEnd && (
        <ConfirmDialog
          title="Force End Season?"
          body="Are you sure? This will end the active season, freeze the leaderboard, and lock Ranked play until the 1st of next month."
          confirmLabel={busy ? "Ending…" : "Yes, End Season"}
          busy={busy}
          onCancel={() => setConfirmEnd(false)}
          onConfirm={handleForceEnd}
        />
      )}

      {confirmStart && (
        <ConfirmDialog
          title="Start a New Season Now?"
          body={
            off
              ? "This starts the next season immediately instead of waiting for the 1st. Player scores and streaks reset for everyone."
              : "A season is already active. Starting a new season now will end it immediately — its scores are frozen and every player's progress resets for the new season."
          }
          confirmLabel={busy ? "Starting…" : "Yes, Start New Season"}
          busy={busy}
          onCancel={() => setConfirmStart(false)}
          onConfirm={handleForceStart}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h3 className="font-bold text-red-600 text-lg">{title}</h3>
        <p className="text-sm text-slate-600">{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}