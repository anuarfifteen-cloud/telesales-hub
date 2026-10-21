import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Gem, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  getSeason,
  updateSeason,
  resetSeason,
  RANK_10_THRESHOLD,
} from "@/lib/milestone";
import AdminStreakRebuild from "./AdminStreakRebuild";

// Admin "Milestone Season Control" panel: season status, auto-reset toggle,
// and manual reset.
export default function AdminMilestoneSeasonControl() {
  const [season, setSeason] = useState(null);
  const [leader, setLeader] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const reload = async () => {
    try {
      const s = await getSeason();
      setSeason(s);
      // Find the leading player this season.
      const page = await base44.entities.MilestoneProgress.filter(
        { season_number: s.season_number },
        { sort: "-score", limit: 1 }
      );
      const rows = page.items || page || [];
      setLeader(rows[0] || null);
      // Closed-season log: champion + the season's highest Ranked win streak.
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

  const handleToggleAutoReset = async (val) => {
    if (!season) return;
    try {
      const updated = await updateSeason(season.id, { auto_reset_enabled: val });
      setSeason(updated);
      toast.success(
        val
          ? "Auto-reset on Diamond claim enabled."
          : "Auto-reset on Diamond claim disabled."
      );
    } catch {
      toast.error("Could not update setting.");
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await resetSeason();
      await reload();
      toast.success("Milestone season reset. A new season has begun.");
    } catch {
      toast.error("Reset failed.");
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  if (!season) {
    return (
      <div className="bg-white rounded-2xl border border-border p-5" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
        <p className="text-sm text-slate-500">Loading milestone season…</p>
      </div>
    );
  }

  const diamondStatus = season.diamond_claimed
    ? `Claimed by ${season.diamond_claimed_by_name || "—"}`
    : "Available";

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🏆 Milestone Season Control</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage the Blackjack 🏆RANK milestone season — view status, toggle
          auto-reset on Diamond claim, or reset the season now.
        </p>
      </div>

      {/* Status view */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Season</p>
          <p className="text-xl font-black text-slate-900">{season.season_number}</p>
        </div>
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">💎 Diamond</p>
          <p
            className={`text-xs font-bold ${
              season.diamond_claimed ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {diamondStatus}
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

      {/* Auto-reset toggle */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Auto-Reset Season on Diamond Claim
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            When on, claiming the Rank 10 Diamond immediately resets the season.
          </p>
        </div>
        <button
          onClick={() => handleToggleAutoReset(!season.auto_reset_enabled)}
          className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            season.auto_reset_enabled ? "bg-emerald-500" : "bg-slate-300"
          }`}
          style={{ width: "52px" }}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              season.auto_reset_enabled ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Manual reset */}
      <button
        onClick={() => setConfirmReset(true)}
        disabled={busy}
        className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" /> Reset Season Now
      </button>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 className="font-bold text-red-600 text-lg">Reset Milestone Season?</h3>
            <p className="text-sm text-slate-600">
              This starts a new season. All players' scores reset to 0, rank
              progress clears, and the Diamond becomes available again.
              Unclaimed rank rewards stay claimable.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {busy ? "Resetting…" : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}