import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, BookOpen, ChevronDown, ChevronUp, CheckCircle2, CheckCircle, XCircle, BarChart2, UserCircle, Pencil, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
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
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.QuizQuestion.list(),
    ]).then(([users, qs]) => {
      setAllUsers(users || []);
      setQuestions(qs || []);
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

  const getFullOptionText = (answer) => {
    const q = questions.find(q => q.id === answer.question_id);
    if (!q || !answer.selected_option) return null;
    const map = { A: q.option_a, B: q.option_b, C: q.option_c };
    return map[answer.selected_option] || null;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-indigo-500" />
        <p className="font-black text-sm text-foreground">📊 Quiz Activity Log</p>
      </div>

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

          <div className="flex flex-col gap-1.5">
            {answers.map((a) => {
              const fullOptionText = getFullOptionText(a);
              return (
                <div
                  key={a.id}
                  className={`flex flex-col gap-1.5 rounded-xl px-3 py-2.5 border text-xs ${
                    a.is_correct
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {a.is_correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">👤 {a.user_name}</p>
                      <p className="text-muted-foreground">📝 {a.question_text || "—"}</p>
                      <p className="text-muted-foreground mt-0.5">
                        🔤 {a.selected_option || "—"}{fullOptionText ? ` — ${fullOptionText}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── User Quiz History ─────────────────────────────────────────────────────────
function UserQuizHistory() {
  const [allUsers, setAllUsers] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editCorrect, setEditCorrect] = useState(true);
  const [editOption, setEditOption] = useState("A");
  const [saving, setSaving] = useState(false);

  // Add answer form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState(getBruneiToday());
  const [addQuestionId, setAddQuestionId] = useState("");
  const [addCorrect, setAddCorrect] = useState(true);
  const [addOption, setAddOption] = useState("A");
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.QuizQuestion.filter({ is_active: true }),
    ]).then(([users, qs]) => {
      setAllUsers(users || []);
      setAllQuestions(qs || []);
    });
  }, []);

  const refreshAnswers = () => {
    if (!selectedUserId) return;
    setLoading(true);
    Promise.all([
      base44.entities.QuizAnswer.filter({ user_id: selectedUserId }),
      base44.entities.QuizScore.filter({ user_id: selectedUserId }),
    ]).then(([rows, scoreRows]) => {
      rows.sort((a, b) => new Date(b.answered_date) - new Date(a.answered_date));
      setAnswers(rows);
      setScore(scoreRows[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!selectedUserId) { setAnswers([]); setScore(null); return; }
    refreshAnswers();
  }, [selectedUserId]);

  const totalCorrect = answers.filter(a => a.is_correct).length;
  const totalWrong = answers.length - totalCorrect;
  const accuracy = answers.length > 0 ? ((totalCorrect / answers.length) * 100).toFixed(1) : null;

  const scoreCorrect = score?.correct_count ?? 0;
  const scoreTotal = score?.total_answered ?? 0;
  const scoreAccuracy = scoreTotal > 0 ? ((scoreCorrect / scoreTotal) * 100).toFixed(0) : null;

  const selectedUser = allUsers.find(u => u.id === selectedUserId);
  const selectedUserName = selectedUser?.full_name || selectedUser?.email || "";

  const getFullOptionText = (answer) => {
    const q = allQuestions.find(q => q.id === answer.question_id);
    if (!q || !answer.selected_option) return null;
    const map = { A: q.option_a, B: q.option_b, C: q.option_c };
    return map[answer.selected_option] || null;
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditCorrect(a.is_correct);
    setEditOption(a.selected_option || "A");
  };

  const handleSaveEdit = async (a) => {
    setSaving(true);
    await base44.entities.QuizAnswer.update(a.id, { is_correct: editCorrect, selected_option: editOption });
    setEditingId(null);
    setSaving(false);
    refreshAnswers();
    toast.success("Answer updated.");
  };

  const handleDelete = async (a) => {
    if (!window.confirm("Delete this answer record? This cannot be undone.")) return;
    await base44.entities.QuizAnswer.delete(a.id);
    refreshAnswers();
    toast.success("Answer deleted.");
  };

  const handleAddAnswer = async () => {
    if (!addQuestionId) return toast.error("Please select a question.");
    setAddSaving(true);
    const q = allQuestions.find(q => q.id === addQuestionId);
    await base44.entities.QuizAnswer.create({
      user_id: selectedUserId,
      user_name: selectedUserName,
      question_id: addQuestionId,
      question_text: q?.question_text || "",
      answered_date: addDate,
      is_correct: addCorrect,
      selected_option: addOption,
    });
    setShowAddForm(false);
    setAddQuestionId("");
    setAddDate(getBruneiToday());
    setAddCorrect(true);
    setAddOption("A");
    setAddSaving(false);
    refreshAnswers();
    toast.success("Answer added.");
  };

  const inputCls = "border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <UserCircle className="w-4 h-4 text-indigo-500" />
        <p className="font-black text-sm text-foreground">👤 User Quiz History</p>
      </div>

      <select
        value={selectedUserId}
        onChange={e => { setSelectedUserId(e.target.value); setEditingId(null); setShowAddForm(false); }}
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
          {/* Summary bar */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{answers.length} total answers</p>
              <div className="flex gap-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {totalCorrect} correct
                </span>
                <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {totalWrong} wrong
                </span>
              </div>
            </div>
            {accuracy !== null && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">🎯 Accuracy: {accuracy}%</span>
            )}
          </div>

          {/* Quiz Score — read-only season standing */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">📊 Quiz Score (Season Standing)</p>
            <div className="flex flex-wrap gap-3">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✅ {scoreCorrect} correct</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">📝 {scoreTotal} answered</span>
              {scoreAccuracy !== null && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🎯 {scoreAccuracy}% accuracy</span>
              )}
            </div>
            {!score && (
              <p className="text-[10px] text-muted-foreground">No season score record yet. Scores populate as users play.</p>
            )}
          </div>

          {/* Add Answer Button / Form */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              + Add Answer
            </button>
          )}
          {showAddForm && (
            <div className="border border-indigo-300 dark:border-indigo-700 rounded-xl px-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col gap-3">
              <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">+ Add Answer Record</p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                  <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Question</label>
                  <select value={addQuestionId} onChange={e => setAddQuestionId(e.target.value)} className={`${inputCls} w-full`}>
                    <option value="">Select a question…</option>
                    {allQuestions.map(q => (
                      <option key={q.id} value={q.id}>{q.question_text}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Result</label>
                    <select value={addCorrect ? "correct" : "wrong"} onChange={e => setAddCorrect(e.target.value === "correct")} className={inputCls}>
                      <option value="correct">✅ Correct</option>
                      <option value="wrong">❌ Wrong</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selected Option</label>
                    <select value={addOption} onChange={e => setAddOption(e.target.value)} className={inputCls}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddAnswer} disabled={addSaving} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  {addSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setShowAddForm(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Answer list */}
          {answers.length === 0 && (
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
              No quiz answers found for this user.
            </div>
          )}

          {answers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {answers.map((a) => {
                const fullOptionText = getFullOptionText(a);
                const isEditing = editingId === a.id;
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border text-xs ${
                      a.is_correct
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    }`}
                  >
                    {/* Normal row */}
                    <div className="flex items-start gap-3 px-3 py-2.5">
                      {a.is_correct
                        ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">📅 {a.answered_date}</p>
                        <p className="text-muted-foreground">📝 {a.question_text || "—"}</p>
                        <p className="text-muted-foreground mt-0.5">
                          🔤 {a.selected_option || "—"}{fullOptionText ? ` — ${fullOptionText}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => isEditing ? setEditingId(null) : startEdit(a)} className="p-1 rounded-lg hover:bg-black/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(a)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Edit mode */}
                    {isEditing && (
                      <div className="px-3 pb-3 border-t border-border/50 pt-2 flex flex-col gap-2">
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Result</label>
                            <select value={editCorrect ? "correct" : "wrong"} onChange={e => setEditCorrect(e.target.value === "correct")} className={inputCls}>
                              <option value="correct">✅ Correct</option>
                              <option value="wrong">❌ Wrong</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selected Option</label>
                            <select value={editOption} onChange={e => setEditOption(e.target.value)} className={inputCls}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(a)} disabled={saving} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Season Panel ──────────────────────────────────────────────────────────────
function SeasonPanel() {
  const [scores, setScores] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoreRows, users] = await Promise.all([
        base44.entities.QuizScore.list("-correct_count", 50),
        base44.entities.User.list(),
      ]);
      setScores(scoreRows || []);
      setAllUsers(users || []);
    } catch {
      setScores([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const prizes = [5, 3, 1]; // tokens for 1st, 2nd, 3rd

  const top3 = scores.slice(0, 3);

  const handleAwardWinners = async () => {
    if (top3.length === 0) return toast.error("No scores to award.");
    setAwarding(true);
    try {
      for (let i = 0; i < top3.length; i++) {
        const winner = top3[i];
        const tokenPrize = prizes[i];
        // Get user entity to find their current tokens
        const userRows = await base44.entities.User.filter({ id: winner.user_id });
        const targetUser = userRows[0];
        if (!targetUser) continue;
        const currentTokens = targetUser.earlyAccessTokens ?? 0;
        // Award tokens
        await base44.entities.User.update(targetUser.id, {
          earlyAccessTokens: currentTokens + tokenPrize,
        });
        // Log transaction
        await base44.entities.TokenTransaction.create({
          user_id: winner.user_id,
          user_name: winner.user_name,
          amount: tokenPrize,
          source: `Daily Quiz Season Winner — #${i + 1} Place`,
          timestamp: new Date().toISOString(),
        });
      }
      toast.success("✅ Tokens awarded to top 3 winners!");
    } catch (e) {
      toast.error("Award failed: " + (e?.message || "Unknown error"));
    }
    setAwarding(false);
  };

  const handleResetScores = async () => {
    setResetting(true);
    try {
      for (const s of scores) {
        await base44.entities.QuizScore.delete(s.id);
      }
      setScores([]);
      setConfirmReset(false);
      toast.success("🔄 Season reset! All scores cleared.");
    } catch (e) {
      toast.error("Reset failed: " + (e?.message || "Unknown error"));
    }
    setResetting(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Control</p>
        <p className="font-black text-lg">🏆 Season Management</p>
        <p className="text-xs opacity-80">Award winners and reset the quiz scoreboard</p>
      </div>

      {/* Current Standings */}
      <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Current Standings</p>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : scores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No scores yet this season.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {scores.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${i < 3 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-muted/30 border-border"}`}>
                <span className="text-lg w-8 text-center flex-shrink-0">
                  {i < 3 ? medals[i] : <span className="text-xs font-black text-muted-foreground">#{i + 1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{s.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.correct_count} correct / {s.total_answered} answered
                    {s.total_answered > 0 ? ` — ${((s.correct_count / s.total_answered) * 100).toFixed(0)}% accuracy` : ""}
                  </p>
                </div>
                {i < 3 && (
                  <span className="flex-shrink-0 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-full">
                    +{prizes[i]} 🪙
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award Winners Button */}
      <button
        onClick={handleAwardWinners}
        disabled={awarding || loading || scores.length === 0}
        className="w-full py-3 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : "🏆 Award Tokens to Top 3"}
      </button>
      <p className="text-[10px] text-muted-foreground text-center -mt-2">
        Awards 5 tokens to 1st, 3 tokens to 2nd, 1 token to 3rd. Run this BEFORE resetting.
      </p>

      {/* Reset Season */}
      {!confirmReset ? (
        <button
          onClick={() => setConfirmReset(true)}
          disabled={resetting || loading || scores.length === 0}
          className="w-full py-3 rounded-xl font-black text-sm bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
        >
          🔄 Reset Season Scores
        </button>
      ) : (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-black text-red-700 dark:text-red-300 text-center">⚠️ This will delete ALL quiz scores permanently. Are you sure?</p>
          <p className="text-xs text-red-600 dark:text-red-400 text-center">Make sure you have awarded tokens to winners first!</p>
          <div className="flex gap-2">
            <button
              onClick={handleResetScores}
              disabled={resetting}
              className="flex-1 py-2.5 rounded-xl font-black text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Reset Now"}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="flex-1 py-2.5 rounded-xl font-black text-sm bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
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
        <button
          onClick={() => setActiveTab("season")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "season" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <Trophy className="w-3.5 h-3.5" /> Season
        </button>
      </div>

      {activeTab === "manage" && <AdminQuizManager />}
      {activeTab === "overview" && <QuestionsOverview />}
      {activeTab === "activity" && <QuizActivityLog />}
      {activeTab === "history" && <UserQuizHistory />}
      {activeTab === "season" && <SeasonPanel />}
    </div>
  );
}