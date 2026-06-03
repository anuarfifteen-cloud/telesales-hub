import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Users, Plus, Edit2, X, Check, Rocket, AlertTriangle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRUNEI_TZ = "Asia/Brunei";

function getCycleStartDate() {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ }) + "T00:00:00+08:00");
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getCycleEndDate(startDate) {
  const d = new Date(startDate + "T00:00:00+08:00");
  d.setDate(d.getDate() + 4);
  return d.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

// ── User Picker Modal ──────────────────────────────────────────────────────────
function UserPickerModal({ title, currentP1, currentP2, allUsers, assignedIds, onSave, onClose }) {
  const [p1, setP1] = useState(currentP1 || "");
  const [p2, setP2] = useState(currentP2 || "");

  const getUser = (id) => allUsers.find(u => u.id === id);

  const isDisabled = (userId, excludeId) =>
    assignedIds.has(userId) && userId !== excludeId;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-base text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Player 1</label>
            <select
              value={p1}
              onChange={e => setP1(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Select Player 1 —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id} disabled={isDisabled(u.id, currentP1) || u.id === p2}>
                  {u.full_name || u.email} {isDisabled(u.id, currentP1) && u.id !== p2 ? "(assigned)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Player 2</label>
            <select
              value={p2}
              onChange={e => setP2(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Select Player 2 —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id} disabled={isDisabled(u.id, currentP2) || u.id === p1}>
                  {u.full_name || u.email} {isDisabled(u.id, currentP2) && u.id !== p1 ? "(assigned)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => {
              if (!p1 || !p2) { toast.error("Please select both players."); return; }
              if (p1 === p2) { toast.error("Players must be different."); return; }
              const u1 = getUser(p1), u2 = getUser(p2);
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

// ── Player Answer Detail ──────────────────────────────────────────────────────
function PlayerAnswers({ playerName, questionIds, answers, questions }) {
  const parsedAnswers = JSON.parse(answers || "[null,null,null,null,null]");
  const parsedQIds = JSON.parse(questionIds || "[]");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{playerName}</p>
      {parsedQIds.map((qid, i) => {
        const q = questions[qid];
        const answer = parsedAnswers[i];
        const answered = answer !== null && answer !== undefined;
        const correct = answered && q && answer === q.correct_option;

        return (
          <div key={i} className={`rounded-xl border p-2.5 text-xs ${
            !answered ? "bg-muted border-border opacity-60" :
            correct ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" :
            "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-start gap-1.5">
              <span className={`flex-shrink-0 font-black text-[10px] mt-0.5 ${!answered ? "text-muted-foreground" : correct ? "text-emerald-600" : "text-red-500"}`}>
                Day {i + 1} {answered ? (correct ? "✓" : "✗") : "—"}
              </span>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                {q ? (
                  <>
                    <p className="font-semibold text-foreground leading-snug">{q.question_text}</p>
                    {answered && (
                      <p className={`font-medium ${correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                        Answer: {answer}
                      </p>
                    )}
                    {answered && !correct && q.correct_option && (
                      <p className="text-emerald-700 dark:text-emerald-300">Correct: {q.correct_option}</p>
                    )}
                    {answered && q.justification && (
                      <p className="text-muted-foreground italic bg-muted rounded-lg px-2 py-1 mt-0.5">
                        💡 {q.justification}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading question…</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, index, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState({});
  const [loadingQs, setLoadingQs] = useState(false);

  const totalScore = (team.p1_score || 0) + (team.p2_score || 0);
  const isPerfect = totalScore === 10;

  const handleExpand = async () => {
    if (!expanded && Object.keys(questions).length === 0) {
      setLoadingQs(true);
      const allIds = [
        ...JSON.parse(team.p1_question_ids || "[]"),
        ...JSON.parse(team.p2_question_ids || "[]"),
      ].filter(Boolean);
      const uniqueIds = [...new Set(allIds)];
      const fetched = await Promise.all(
        uniqueIds.map(id => base44.entities.QuizQuestion.filter({ id }).then(r => r[0]).catch(() => null))
      );
      const map = {};
      fetched.forEach(q => { if (q) map[q.id] = q; });
      setQuestions(map);
      setLoadingQs(false);
    }
    setExpanded(v => !v);
  };

  return (
    <div className={`rounded-2xl border flex flex-col gap-2 overflow-hidden ${isPerfect ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300" : "bg-card border-border"}`}>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-muted-foreground uppercase">Team {index + 1}</span>
            {isPerfect && <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">🏆 Perfect!</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(team)} className="text-muted-foreground hover:text-primary transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted rounded-xl p-2">
            <p className="text-[10px] text-muted-foreground truncate">{team.p1_name || "P1"}</p>
            <p className="font-black text-lg text-foreground">{team.p1_score || 0}</p>
          </div>
          <div className={`rounded-xl p-2 border ${isPerfect ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400" : "bg-background border-border"}`}>
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className={`font-black text-lg ${isPerfect ? "text-amber-600" : "text-foreground"}`}>{totalScore}/10</p>
          </div>
          <div className="bg-muted rounded-xl p-2">
            <p className="text-[10px] text-muted-foreground truncate">{team.p2_name || "P2"}</p>
            <p className="font-black text-lg text-foreground">{team.p2_score || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${team.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
            {team.status}
          </span>
          <button
            onClick={handleExpand}
            className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {expanded ? "▲ Hide Answers" : "▼ View Q&A"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-4">
          {loadingQs ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <PlayerAnswers
                playerName={team.p1_name || "Player 1"}
                questionIds={team.p1_question_ids}
                answers={team.p1_answers}
                questions={questions}
              />
              <div className="h-px bg-border" />
              <PlayerAnswers
                playerName={team.p2_name || "Player 2"}
                questionIds={team.p2_question_ids}
                answers={team.p2_answers}
                questions={questions}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── User Summary Table ────────────────────────────────────────────────────────
function computeUserStats(teams, cycleStartDate) {
  const stats = {};

  const getOrCreate = (id, name) => {
    if (!stats[id]) stats[id] = { id, name, correct: 0, wrong: 0, unanswered: 0, answered: 0, streak: 0 };
    return stats[id];
  };

  teams.forEach(team => {
    [
      { id: team.p1_id, name: team.p1_name, answers: team.p1_answers, playedDates: team.p1_played_dates, score: team.p1_score },
      { id: team.p2_id, name: team.p2_name, answers: team.p2_answers, playedDates: team.p2_played_dates, score: team.p2_score },
    ].forEach(({ id, name, answers, playedDates, score }) => {
      if (!id) return;
      const s = getOrCreate(id, name || id);
      const parsedAnswers = JSON.parse(answers || "[null,null,null,null,null]");
      const parsedDates = JSON.parse(playedDates || "[]");

      parsedAnswers.forEach(a => {
        if (a === null || a === undefined) s.unanswered++;
        else s.answered++;
      });

      s.correct = score || 0;
      s.wrong = s.answered - s.correct;

      // Streak: consecutive days answered starting from day 1 of cycle
      let streak = 0;
      for (let i = 0; i < 5; i++) {
        const d = new Date(cycleStartDate + "T00:00:00+08:00");
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
        if (parsedDates.includes(dateStr)) streak++;
        else break;
      }
      s.streak = streak;
    });
  });

  return Object.values(stats).sort((a, b) => b.correct - a.correct || a.wrong - b.wrong);
}

function UserSummaryTable({ teams, cycleStartDate }) {
  const stats = computeUserStats(teams, cycleStartDate);

  if (stats.length === 0) return (
    <div className="text-center py-10 text-muted-foreground text-sm">No data yet. Kick off a cycle first.</div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-6 gap-1 px-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
        <div className="col-span-2">Player</div>
        <div className="text-center text-emerald-600">✓ Right</div>
        <div className="text-center text-red-500">✗ Wrong</div>
        <div className="text-center text-slate-400">— Skip</div>
        <div className="text-center text-amber-500">🔥 Streak</div>
      </div>

      {stats.map((s, i) => {
        const total = s.correct + s.wrong;
        const winRate = total > 0 ? Math.round((s.correct / total) * 100) : null;
        return (
          <div key={s.id} className="bg-card border border-border rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
            <div className="grid grid-cols-6 gap-1 items-center">
              <div className="col-span-2 flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-black text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
                <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-emerald-600">{s.correct}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-red-500">{s.wrong}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-muted-foreground">{s.unanswered}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-amber-500">{s.streak > 0 ? `${s.streak}🔥` : "—"}</span>
              </div>
            </div>
            {/* Win rate bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: winRate !== null ? `${winRate}%` : "0%" }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground w-10 text-right">
                {winRate !== null ? `${winRate}%` : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDailyQuizTab() {
  const cycleStartDate = getCycleStartDate();
  const cycleEndDate = getCycleEndDate(cycleStartDate);
  const weekNum = getWeekNumber(cycleStartDate);

  const [activeTab, setActiveTab] = useState("summary");
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kicking, setKicking] = useState(false);
  const [confirmKickOff, setConfirmKickOff] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedTeams, fetchedUsers] = await Promise.all([
      base44.entities.DuoMatchCycle.filter({ cycle_start_date: cycleStartDate }),
      base44.entities.User.list(),
    ]);
    setTeams(fetchedTeams);
    setAllUsers(fetchedUsers.filter(u => u.role !== "admin"));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const assignedIds = new Set([
    ...teams.map(t => t.p1_id),
    ...teams.map(t => t.p2_id),
  ].filter(Boolean));

  const handleKickOff = async () => {
    setKicking(true);
    setConfirmKickOff(false);
    const res = await base44.functions.invoke("generateDuoPairsForNewCycle", {});
    const data = res.data;
    if (data?.success) {
      toast.success(`✅ ${data.pairs_created} teams generated for Week ${weekNum}!`);
      fetchData();
    } else {
      toast.error(data?.error || "Failed to generate pairs.");
    }
    setKicking(false);
  };

  const handleEditSave = async ({ p1, p2 }) => {
    await base44.entities.DuoMatchCycle.update(editingTeam.id, {
      p1_id: p1.id,
      p1_email: p1.email,
      p1_name: p1.full_name || p1.email?.split("@")[0],
      p2_id: p2.id,
      p2_email: p2.email,
      p2_name: p2.full_name || p2.email?.split("@")[0],
    });
    toast.success("Team updated!");
    setEditingTeam(null);
    fetchData();
  };

  const handleAddSave = async ({ p1, p2 }) => {
    // Fetch 5 random active questions for each player
    const questions = await base44.entities.QuizQuestion.filter({ is_active: true });
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const pool = shuffle(questions);
    const p1Qs = pool.slice(0, 5).map(q => q.id);
    const p2Qs = pool.slice(5, 10).map(q => q.id);

    await base44.entities.DuoMatchCycle.create({
      p1_id: p1.id,
      p1_email: p1.email,
      p1_name: p1.full_name || p1.email?.split("@")[0],
      p2_id: p2.id,
      p2_email: p2.email,
      p2_name: p2.full_name || p2.email?.split("@")[0],
      cycle_start_date: cycleStartDate,
      cycle_end_date: cycleEndDate,
      status: "active",
      p1_question_ids: JSON.stringify(p1Qs),
      p2_question_ids: JSON.stringify(p2Qs),
      p1_answers: JSON.stringify([null, null, null, null, null]),
      p2_answers: JSON.stringify([null, null, null, null, null]),
      p1_played_dates: "[]",
      p2_played_dates: "[]",
      p1_score: 0,
      p2_score: 0,
      p1_claimed: false,
      p2_claimed: false,
    });
    toast.success("Team added!");
    setShowAddModal(false);
    fetchData();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Cycle Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Current Cycle</p>
        <p className="font-black text-lg">Week {weekNum}</p>
        <p className="text-xs opacity-80">{cycleStartDate} → {cycleEndDate}</p>
      </div>

      {/* Kick Off Button */}
      {!confirmKickOff ? (
        <button
          onClick={() => teams.length > 0 ? setConfirmKickOff(true) : handleKickOff()}
          disabled={kicking}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50"
        >
          {kicking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
          {kicking ? "Generating…" : "🚀 Kick Off New Cycle (Auto-Pair All)"}
        </button>
      ) : (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">{teams.length} existing teams will be deleted and re-shuffled!</p>
          </div>
          <button onClick={handleKickOff} className="text-[11px] font-black text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg">Confirm</button>
          <button onClick={() => setConfirmKickOff(false)} className="text-[11px] text-muted-foreground hover:text-foreground font-semibold">Cancel</button>
        </div>
      )}

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

      {/* Summary Tab */}
      {activeTab === "summary" && (
        loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <UserSummaryTable teams={teams} cycleStartDate={cycleStartDate} />
        )
      )}

      {/* Teams Tab */}
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
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : teams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No teams yet. Kick off a new cycle to get started!</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {teams.map((team, i) => (
                <TeamCard key={team.id} team={team} index={i} onEdit={setEditingTeam} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingTeam && (
        <UserPickerModal
          title="Edit Team"
          currentP1={editingTeam.p1_id}
          currentP2={editingTeam.p2_id}
          allUsers={allUsers}
          assignedIds={assignedIds}
          onSave={handleEditSave}
          onClose={() => setEditingTeam(null)}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <UserPickerModal
          title="Add Team Manually"
          currentP1=""
          currentP2=""
          allUsers={allUsers}
          assignedIds={assignedIds}
          onSave={handleAddSave}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}