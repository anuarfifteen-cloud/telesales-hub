import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, RefreshCw, Users, Target, Gift } from "lucide-react";
import { bruneiToday } from "@/lib/bruneiDay";
import {
  MISSION_COMBINATIONS,
  progressFor,
  bonusCardUnlocked,
} from "@/lib/dailyChallenges";

// The perk a claimed Bonus Mystery Card awarded, in table-friendly wording.
const BONUS_PERK = {
  surge_2x: "2× Surge",
  bet_cap_25: "Max Bet 25",
  chips_100: "+100 Chips/Rank",
};

// The stored mission set identifies which of the 10 fixed combinations a player
// was dealt today — combinations are never stored as a number.
function comboKey(missions) {
  return (missions || []).map((m) => `${m.type}:${m.target}`).join("|");
}
function comboNumberFor(missions) {
  const key = comboKey(missions);
  if (!key) return null;
  const i = MISSION_COMBINATIONS.findIndex((c) => comboKey(c) === key);
  return i >= 0 ? i + 1 : null;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div
      className="rounded-2xl border border-border bg-white p-4"
      style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sub}</p>
    </div>
  );
}

function MissionCell({ step }) {
  if (!step) return <span className="text-slate-300">—</span>;
  return step.done ? (
    <span className="font-bold text-emerald-600">
      {step.progress}/{step.target} ✓
    </span>
  ) : (
    <span className="text-slate-500">
      {step.progress}/{step.target} — In Progress
    </span>
  );
}

function TotalBadge({ claimed, total }) {
  const complete = total > 0 && claimed >= total;
  const tone = complete
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : claimed > 0
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-border bg-slate-50 text-slate-500";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {claimed}/{total}
      {complete ? " Complete" : ""}
    </span>
  );
}

function BonusBadge({ status, perk }) {
  if (status === "claimed") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        ✓ Claimed{perk ? ` · ${perk}` : ""}
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        ⚡ Ready
      </span>
    );
  }
  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-border bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      🔒 Locked
    </span>
  );
}

// Admin monitor for Daily Missions. Defaults to today's Brunei date and covers
// every registered player — those without a record for the day show as
// inactive with no progress. Refresh is manual (no polling).
export default function AdminDailyMissions() {
  const [day, setDay] = useState(bruneiToday());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetDay) => {
    setLoading(true);
    const [usersRaw, page] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.DailyChallenge.filter({ day: targetDay }, { limit: 500 }),
    ]);
    const users = Array.isArray(usersRaw) ? usersRaw : usersRaw?.items || [];
    const records = page?.items || [];
    const byUser = {};
    records.forEach((r) => {
      if (r.user_id) byUser[r.user_id] = r;
    });

    const next = users.map((u) => {
      const daily = byUser[u.id] || null;
      const missions = [...(daily?.missions || [])].sort((a, b) => a.slot - b.slot);
      const counters = daily?.counters || {};
      const steps = [0, 1, 2].map((i) => {
        const m = missions[i];
        if (!m) return null;
        const progress = Math.min(progressFor(m.type, counters), m.target);
        return { progress, target: m.target, done: progress >= m.target };
      });
      const revealed = daily?.bonus_mystery_card_status === "revealed";
      return {
        id: u.id,
        name: u.full_name || u.email || "Player",
        active: !!daily,
        combo: comboNumberFor(missions),
        steps,
        claimed: missions.filter((m) => m.claimed).length,
        total: missions.length || 3,
        bonus: revealed ? "claimed" : daily && bonusCardUnlocked(daily) ? "ready" : "locked",
        perk: BONUS_PERK[daily?.bonus_mystery_card_reward] || null,
      };
    });

    next.sort((a, b) => b.claimed - a.claimed || a.name.localeCompare(b.name));
    setRows(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(day);
  }, [day, load]);

  const totalPlayers = rows.length;
  const activePlayers = rows.filter((r) => r.active).length;
  const allCleared = rows.filter((r) => r.active && r.claimed === r.total).length;
  const bonusClaimed = rows.filter((r) => r.bonus === "claimed").length;

  return (
    <div className="space-y-4">
      {/* Date filter + manual refresh */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4"
        style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}
      >
        <CalendarDays className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-700">Brunei date</span>
        <input
          type="date"
          value={day}
          max={bruneiToday()}
          onChange={(e) => setDay(e.target.value || bruneiToday())}
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        />
        {day === bruneiToday() && (
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Today</span>
        )}
        <button
          onClick={() => load(day)}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Active Players Today" value={`${activePlayers} / ${totalPlayers}`} sub="Active" />
        <StatCard icon={Target} label="All Missions Cleared" value={`${allCleared} / ${totalPlayers}`} sub="Completed" />
        <StatCard icon={Gift} label="Bonus Cards Claimed" value={`${bonusClaimed}`} sub="Claimed" />
      </div>

      {/* Daily progress table */}
      <div
        className="overflow-hidden rounded-2xl border border-border bg-white"
        style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                {["Player", "Assigned Combo", "Mission 1", "Mission 2", "Mission 3", "Daily Total", "Bonus Card"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs font-semibold text-slate-400">
                    Loading player progress…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs font-semibold text-slate-400">
                    No registered players yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-800">{r.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-slate-500">
                      {r.combo ? `Combo ${r.combo}` : "—"}
                    </td>
                    {[0, 1, 2].map((i) => (
                      <td key={i} className="whitespace-nowrap px-3 py-2.5 text-[11px]">
                        <MissionCell step={r.steps[i]} />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <TotalBadge claimed={r.claimed} total={r.total} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <BonusBadge status={r.bonus} perk={r.perk} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}