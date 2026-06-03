import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Plus, X, Check, Trash2, BarChart2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAUNCH_DATE = new Date("2026-06-04T00:00:00+08:00");
const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getCurrentCycleId() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const diffDays = Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  const cycleNumber = Math.max(0, Math.floor(diffDays / 5));
  return `Block_${cycleNumber}`;
}

function getCycleRange() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const diffDays = Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  const cycleNumber = Math.max(0, Math.floor(diffDays / 5));
  const blockStart = new Date(LAUNCH_DATE);
  blockStart.setDate(blockStart.getDate() + cycleNumber * 5);
  const blockEnd = new Date(blockStart);
  blockEnd.setDate(blockEnd.getDate() + 4);
  return {
    cycleId: `Block_${cycleNumber}`,
    start: blockStart.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ }),
    end: blockEnd.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ }),
  };
}

// ── Add Team Modal ────────────────────────────────────────────────────────────
function AddTeamModal({ allUsers, assignedIds, onSave, onClose }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-base text-foreground">Add Team Manually</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Player 1</label>
            <select value={p1} onChange={e => setP1(e.target.value)} className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Select Player 1 —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id} disabled={assignedIds.has(u.id) || u.id === p2}>
                  {u.full_name || u.email} {assignedIds.has(u.id) ? "(assigned)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Player 2</label>
            <select value={p2} onChange={e => setP2(e.target.value)} className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">— Select Player 2 —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id} disabled={assignedIds.has(u.id) || u.id === p1}>
                  {u.full_name || u.email} {assignedIds.has(u.id) ? "(assigned)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => {
              if (!p1 || !p2) { toast.error("Please select both players."); return; }
              const u1 = allUsers.find(u => u.id === p1);
              const u2 = allUsers.find(u => u.id === p2);
              onSave({ p1: u1, p2: u2 });
            }}
            className="flex-1 bg-primary text-primary-foreground font-bold"
          >
            <Check className="w-4 h-4 mr-1" /> Save Team
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, scoreRecord, onDelete }) {
  const teamName = `${team.player1_name || "P1"} & ${team.player2_name || "P2"}`;
  const p1Score = scoreRecord?.p1_score || 0;
  const p2Score = scoreRecord?.p2_score || 0;
  const teamScore = p1Score + p2Score;
  const isPerfect = teamScore === 10;
  const p1Played = JSON.parse(scoreRecord?.p1_played_dates || "[]").length;
  const p2Played = JSON.parse(scoreRecord?.p2_played_dates || "[]").length;

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isPerfect ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300" : "bg-card border-border"}`}>
      <div className="flex items-center justify-between">
        <p className="font-black text-sm text-foreground">{teamName}</p>
        <div className="flex items-center gap-2">
          {isPerfect && <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">🏆 Perfect!</span>}
          <button onClick={() => onDelete(team)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete team">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted rounded-xl p-2">
          <p className="text-[10px] text-muted-foreground truncate">{team.player1_name || "P1"}</p>
          <p className="font-black text-lg text-foreground">{p1Score}/5</p>
          <p className="text-[9px] text-muted-foreground">{p1Played} days played</p>
        </div>
        <div className={`rounded-xl p-2 border ${isPerfect ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400" : "bg-background border-border"}`}>
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className={`font-black text-lg ${isPerfect ? "text-amber-600" : "text-foreground"}`}>{teamScore}/10</p>
        </div>
        <div className="bg-muted rounded-xl p-2">
          <p className="text-[10px] text-muted-foreground truncate">{team.player2_name || "P2"}</p>
          <p className="font-black text-lg text-foreground">{p2Score}/5</p>
          <p className="text-[9px] text-muted-foreground">{p2Played} days played</p>
        </div>
      </div>
    </div>
  );
}

// ── Player Summary ────────────────────────────────────────────────────────────
function PlayerSummary({ teams, scoreRecords }) {
  const scoreMap = {};
  scoreRecords.forEach(s => { scoreMap[s.team_id] = s; });

  const players = [];
  teams.forEach(t => {
    const s = scoreMap[t.id];
    players.push({ name: t.player1_name || "P1", correct: s?.p1_score || 0, played: JSON.parse(s?.p1_played_dates || "[]").length });
    players.push({ name: t.player2_name || "P2", correct: s?.p2_score || 0, played: JSON.parse(s?.p2_played_dates || "[]").length });
  });
  players.sort((a, b) => b.correct - a.correct);

  if (!players.length) return <div className="text-center py-10 text-muted-foreground text-sm">No teams yet.</div>;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1 px-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
        <div className="col-span-2">Player</div>
        <div className="text-center text-emerald-600">✓ Correct</div>
        <div className="text-center text-slate-400">Days</div>
      </div>
      {players.map((p, i) => (
        <div key={i} className="bg-card border border-border rounded-xl px-3 py-2.5 grid grid-cols-4 gap-1 items-center">
          <div className="col-span-2 flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-muted-foreground w-4">#{i + 1}</span>
            <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
          </div>
          <div className="text-center"><span className="text-sm font-black text-emerald-600">{p.correct}</span></div>
          <div className="text-center"><span className="text-sm font-black text-muted-foreground">{p.played}/5</span></div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDailyQuizTab() {
  const { cycleId, start, end } = getCycleRange();

  const [activeTab, setActiveTab] = useState("summary");
  const [teams, setTeams] = useState([]);
  const [scoreRecords, setScoreRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedTeams, fetchedUsers] = await Promise.all([
      base44.entities.DuoTeam.list(),
      base44.entities.User.list(),
    ]);
    setTeams(fetchedTeams);
    setAllUsers(fetchedUsers.filter(u => u.role !== "admin"));

    if (fetchedTeams.length > 0) {
      const scores = await base44.entities.FiveDayScore.filter({ cycle_id: cycleId });
      setScoreRecords(scores);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const assignedIds = new Set([
    ...teams.map(t => t.player1_id),
    ...teams.map(t => t.player2_id),
  ].filter(Boolean));

  const handleAddSave = async ({ p1, p2 }) => {
    await base44.entities.DuoTeam.create({
      player1_id: p1.id,
      player1_email: p1.email,
      player1_name: p1.full_name || p1.email?.split("@")[0],
      player2_id: p2.id,
      player2_email: p2.email,
      player2_name: p2.full_name || p2.email?.split("@")[0],
    });
    toast.success("Team created!");
    setShowAddModal(false);
    fetchData();
  };

  const handleDelete = async (team) => {
    setDeletingId(team.id);
    await base44.entities.DuoTeam.delete(team.id);
    toast.success(`Team deleted.`);
    setDeletingId(null);
    fetchData();
  };

  const scoreMap = {};
  scoreRecords.forEach(s => { scoreMap[s.team_id] = s; });

  return (
    <div className="flex flex-col gap-4">
      {/* Cycle Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Current Cycle</p>
        <p className="font-black text-lg">{cycleId}</p>
        <p className="text-xs opacity-80">{start} → {end}</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "summary" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Player Summary
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "teams" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <Users className="w-3.5 h-3.5" /> Teams
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {activeTab === "summary" && (
            <PlayerSummary teams={teams} scoreRecords={scoreRecords} />
          )}

          {activeTab === "teams" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Teams ({teams.length})</span>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Team Manually
                </button>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No teams yet. Add one manually!</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {teams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      scoreRecord={scoreMap[team.id] || null}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAddModal && (
        <AddTeamModal
          allUsers={allUsers}
          assignedIds={assignedIds}
          onSave={handleAddSave}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}