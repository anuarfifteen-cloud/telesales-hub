import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, BookOpen, ChevronDown, ChevronUp, CheckCircle2, CheckCircle, XCircle, BarChart2, UserCircle } from "lucide-react";
import AdminQuizManager from "./AdminQuizManager";

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

// ── Questions Overview ────────────────────────────────────────────────────────
function QuestionsOverview() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    base44.entities.QuizQuestion.list().then(q => {
      setQuestions(q);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!questions.length) return <div className="text-center py-8 text-muted-foreground text-sm">No questions found.</div>;

  const activeQuestions = questions.filter(q => q.is_active);
  const inactiveQuestions = questions.filter(q => !q.is_active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
          Active Questions ({activeQuestions.length})
        </p>
        <div className="flex flex-col gap-2">
          {activeQuestions.map((q, i) => (
            <div key={q.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-3 py-3 flex items-start justify-between gap-2"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-black text-muted-foreground mt-0.5 shrink-0">Q{i + 1}</span>
                  <p className="text-xs font-semibold text-foreground leading-snug">{q.question_text}</p>
                </div>
                {expandedId === q.id
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                }
              </button>
              {expandedId === q.id && (
                <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/40 flex flex-col gap-2">
                  {[{ label: "A", val: q.option_a }, { label: "B", val: q.option_b }, { label: "C", val: q.option_c }].map(opt => (
                    <div key={opt.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${opt.val === q.correct_option ? "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold" : "bg-background border border-border text-foreground"}`}>
                      <span className="font-black opacity-60">{opt.label}.</span>
                      <span>{opt.val}</span>
                      {opt.val === q.correct_option && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                  {q.justification && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">💡 Justification</p>
                      <p className="text-xs text-foreground">{q.justification}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {inactiveQuestions.length > 0 && (
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
            Inactive Questions ({inactiveQuestions.length})
          </p>
          <div className="flex flex-col gap-2">
            {inactiveQuestions.map((q) => (
              <div key={q.id} className="bg-muted border border-border rounded-xl px-3 py-2.5 opacity-60">
                <p className="text-xs font-semibold text-muted-foreground line-through">{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quiz Activity Log ─────────────────────────────────────────────────────────
function QuizActivityLog() {
  const [date, setDate] = useState(getBruneiToday());
  const [answers, setAnswers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [streakRecords, setStreakRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.QuizStreak.list(),
    ]).then(([users, streaks]) => {
      setAllUsers(users || []);
      setStreakRecords(streaks || []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    base44.entities.QuizAnswer.filter({ answered_date: date }).then(rows => {
      rows.sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
      setAnswers(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  const correct = answers.filter(a => a.is_correct).length;
  const wrong = answers.length - correct;

  const getStreak = (userId) => {
    const record = streakRecords.find(r => r.user_id === userId);
    return record?.streak_count ?? 0;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-indigo-500" />
        <p className="font-black text-sm text-foreground">📊 Quiz Activity Log</p>
      </div>

      {/* Date filter */}
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : answers.length === 0 ? (
        <div className="bg-muted/40 border border-border rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
          No quiz activity for this date.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
              {answers.length}/14 answered today
            </p>
            <div className="flex gap-3">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {correct} correct
              </span>
              <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> {wrong} wrong
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-1.5">
            {answers.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-xs ${
                  a.is_correct
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}
              >
                {/* Correct/wrong icon */}
                {a.is_correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                }
                {/* User */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">👤 {a.user_name}</p>
                  <p className="text-muted-foreground truncate">
                    📝 {a.question_text ? (a.question_text.length > 60 ? a.question_text.slice(0, 60) + "…" : a.question_text) : "—"}
                  </p>
                </div>
                {/* Option picked */}
                <span className="shrink-0 font-black text-xs px-2 py-0.5 rounded-full bg-background border border-border text-foreground">
                  🔤 {a.selected_option || "—"}
                </span>
                {/* Streak */}
                <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  🔥 {getStreak(a.user_id)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── User Quiz History ─────────────────────────────────────────────────────────
function UserQuizHistory() {
  const [allUsers, setAllUsers] = useState([]);
  const [streakRecords, setStreakRecords] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.QuizStreak.list(),
    ]).then(([users, streaks]) => {
      setAllUsers(users || []);
      setStreakRecords(streaks || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);
    base44.entities.QuizAnswer.filter({ user_id: selectedUserId })
      .then(rows => {
        rows.sort((a, b) => new Date(b.answered_date) - new Date(a.answered_date));
        setAnswers(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedUserId]);

  const streakRecord = streakRecords.find(r => r.user_id === selectedUserId);
  const currentStreak = streakRecord?.streak_count ?? 0;
  const lastCorrectDate = streakRecord?.last_correct_date ?? null;
  const totalCorrect = answers.filter(a => a.is_correct).length;
  const totalWrong = answers.length - totalCorrect;
  const accuracy = answers.length > 0 ? ((totalCorrect / answers.length) * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <UserCircle className="w-4 h-4 text-indigo-500" />
        <p className="font-black text-sm text-foreground">👤 User Quiz History</p>
      </div>

      <select
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">Select a user...</option>
        {allUsers
          .filter(u => u.full_name || u.email)
          .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
          .map(u => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))
        }
      </select>

      {!selectedUserId && (
        <div className="bg-muted/40 border border-border rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
          Select a user to view their quiz history.
        </div>
      )}

      {selectedUserId && loading && (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      )}

      {selectedUserId && !loading && (
        <>
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                {answers.length} total answers
              </p>
              <div className="flex gap-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {totalCorrect} correct
                </span>
                <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {totalWrong} wrong
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {accuracy !== null && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">🎯 Accuracy: {accuracy}%</span>
              )}
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🔥 Current streak: {currentStreak} day{currentStreak !== 1 ? "s" : ""}</span>
              {lastCorrectDate && (
                <span className="text-xs text-muted-foreground">📅 Last correct: {lastCorrectDate}</span>
              )}
            </div>
          </div>

          {answers.length === 0 && (
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
              No quiz answers found for this user.
            </div>
          )}

          {answers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {answers.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-xs ${
                    a.is_correct
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  {a.is_correct
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">📅 {a.answered_date}</p>
                    <p className="text-muted-foreground truncate">
                      📝 {a.question_text ? (a.question_text.length > 60 ? a.question_text.slice(0, 60) + "…" : a.question_text) : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-black text-xs px-2 py-0.5 rounded-full bg-background border border-border text-foreground">
                    🔤 {a.selected_option || "—"}
                  </span>
                  <span className={`shrink-0 font-bold text-xs px-2 py-0.5 rounded-full ${a.is_correct ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                    {a.is_correct ? "✅ Correct" : "❌ Wrong"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDailyQuizTab() {
  const [activeTab, setActiveTab] = useState("manage");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Panel</p>
        <p className="font-black text-lg">Daily Quiz</p>
        <p className="text-xs opacity-80">Manage questions for the solo daily quiz</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("manage")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "manage" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Manage
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "activity" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Activity
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <UserCircle className="w-3.5 h-3.5" /> History
        </button>
      </div>

      {activeTab === "manage" && <AdminQuizManager />}
      {activeTab === "overview" && <QuestionsOverview />}
      {activeTab === "activity" && <QuizActivityLog />}
      {activeTab === "history" && <UserQuizHistory />}
    </div>
  );
}