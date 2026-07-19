import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getTodayKey() {
  return `solo_quiz_answered_${getBruneiToday()}`;
}
function getTodayRecord() {
  const raw = localStorage.getItem(getTodayKey());
  return raw ? JSON.parse(raw) : null;
}
function saveTodayRecord(data) {
  localStorage.setItem(getTodayKey(), JSON.stringify(data));
}
function getLastSeenId() {
  return localStorage.getItem("solo_quiz_last_id") || null;
}
function saveLastSeenId(id) {
  localStorage.setItem("solo_quiz_last_id", id);
}

// ── Top 3 Season Leaderboard ───────────────────────────────────────────────────
function LeaderboardCard({ leaders, currentUserId }) {
  if (!leaders || leaders.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center">
        <div className="flex items-center gap-2 justify-center mb-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Season Leaderboard</p>
        </div>
        <p className="text-xs text-muted-foreground">No scores yet — be the first to top the chart!</p>
      </div>
    );
  }
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-4 h-4 text-amber-500" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Season Leaderboard — Top 3</p>
      </div>
      {leaders.map((s, i) => {
        const isYou = s.user_id === currentUserId;
        const correct = s.correct_count ?? 0;
        const total = s.total_answered ?? 0;
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
              isYou
                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                : "bg-muted/30 border-border"
            }`}
          >
            <span className="text-lg w-6 text-center flex-shrink-0">{medals[i]}</span>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <p className="font-bold text-foreground text-sm truncate">
                {s.user_name}
                {isYou && <span className="text-[10px] text-indigo-500 ml-1">(You)</span>}
              </p>
              <span className="text-xs font-black text-foreground tabular-nums flex-shrink-0">
                {correct}/{total} correct
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlreadyAnsweredCard({ record }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${record.correct ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
      <div className="flex items-center gap-2">
        {record.correct ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
        <p className={`font-black text-sm ${record.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
          {record.correct ? "✅ Correct! Well done." : "❌ Incorrect today."}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">Come back tomorrow for your next question.</p>
    </div>
  );
}

export default function DailyDuoGame({ user, onUserUpdate }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [todayRecord, setTodayRecord] = useState(() => getTodayRecord());
  const [quizEnabled, setQuizEnabled] = useState(true);

  const loadLeaders = async () => {
    try {
      const rows = await base44.entities.QuizScore.list("-correct_count", 3);
      setLeaders(rows || []);
    } catch {
      setLeaders([]);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      const settings = await base44.entities.AppSettings.list();
      if (settings[0]?.quiz_enabled === false) {
        setQuizEnabled(false);
        setLoading(false);
        return;
      }

      await loadLeaders();

      if (getTodayRecord()) {
        setLoading(false);
        return;
      }

      const questions = await base44.entities.QuizQuestion.filter({ is_active: true });
      if (!questions.length) { setLoading(false); return; }
      const lastId = getLastSeenId();
      const pool = questions.length > 1 ? questions.filter(q => q.id !== lastId) : questions;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setQuestion(picked);
      setLoading(false);
    };

    init();
  }, [user?.id]);

  const handleAnswer = (opt) => {
    if (pendingResult || !question) return;
    setSelected(opt);
    setPendingResult({
      correct: opt === question.correct_option,
      correct_answer: question.correct_option,
      justification: question.justification || null,
      selectedAnswer: opt,
    });
  };

  const handleFinish = async () => {
    if (finishing || !pendingResult || !question) return;
    setFinishing(true);

    const today = getBruneiToday();
    const isCorrect = pendingResult.correct;

    const opts = [question.option_a, question.option_b, question.option_c];
    const selectedOptionLetter = ["A", "B", "C"][opts.indexOf(pendingResult.selectedAnswer)] ?? "";

    let duplicateDetected = false;
    try {
      await base44.entities.QuizAnswer.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        question_id: question.id,
        question_text: question.question_text,
        answered_date: today,
        is_correct: isCorrect,
        selected_option: selectedOptionLetter,
      });
    } catch (e) {
      duplicateDetected = true;
    }

    // Update or create season score
    if (!duplicateDetected) {
      try {
        const existing = await base44.entities.QuizScore.filter({ user_id: user.id });
        const scoreRecord = existing[0];
        const payload = {
          user_id: user.id,
          user_name: user.full_name || user.email?.split("@")[0] || "Player",
          total_answered: (scoreRecord?.total_answered ?? 0) + 1,
          correct_count: (scoreRecord?.correct_count ?? 0) + (isCorrect ? 1 : 0),
          last_answered_date: today,
        };
        if (scoreRecord?.id) {
          await base44.entities.QuizScore.update(scoreRecord.id, payload);
        } else {
          await base44.entities.QuizScore.create(payload);
        }
        await loadLeaders();
      } catch (e) {
        console.error("QuizScore update failed:", e);
      }
    }

    const localRecord = { answered: true, correct: isCorrect, questionId: question.id };
    saveTodayRecord(localRecord);
    setTodayRecord(localRecord);
    saveLastSeenId(question.id);

    await onUserUpdate();
    if (duplicateDetected) {
      toast.info("Score updated. Your answer was already logged for today.");
    }
    setFinishing(false);
  };

  const options = question ? [question.option_a, question.option_b, question.option_c] : [];

  return (
    <div className="flex flex-col gap-3">

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Maintenance Mode */}
      {!loading && !quizEnabled && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🔧</span>
          <p className="font-bold text-sm text-foreground">Daily Quiz is currently under maintenance.</p>
          <p className="text-xs text-muted-foreground">Please check again Next Time!</p>
        </div>
      )}

      {/* All quiz content — only when quiz is enabled */}
      {!loading && quizEnabled && (
        <>
          {/* Header */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🧠</span>
              <h3 className="font-black text-base text-foreground">Daily Quiz</h3>
              <span className="ml-auto text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full">Solo Daily</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Answer 1 question per day and climb the season leaderboard!
            </p>
          </div>

          {/* Top 3 Leaderboard */}
          <LeaderboardCard leaders={leaders} currentUserId={user?.id} />

          {/* Already answered today */}
          {todayRecord && (
            <AlreadyAnsweredCard record={todayRecord} />
          )}

          {/* No questions available */}
          {!todayRecord && !question && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">📭</span>
              <p className="font-bold text-sm text-foreground">No active questions available.</p>
              <p className="text-xs text-muted-foreground">Ask your admin to add some quiz questions!</p>
            </div>
          )}

          {/* Active question */}
          {!todayRecord && question && (
            <div className="flex flex-col gap-3">
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Today's Question</p>
                <p className="font-bold text-foreground text-sm leading-relaxed">{question.question_text}</p>
              </div>

              <div className="flex flex-col gap-2">
                {options.map((opt, i) => {
                  const isSelected = selected === opt;
                  const isCorrectOpt = opt === question.correct_option;
                  const revealed = !!pendingResult;

                  let cls = "bg-card border-border text-foreground hover:bg-muted";
                  if (revealed) {
                    if (isCorrectOpt) cls = "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold";
                    else if (isSelected) cls = "bg-red-100 dark:bg-red-950/50 border-red-400 text-red-700 dark:text-red-300 font-bold";
                    else cls = "bg-muted border-border text-muted-foreground opacity-60";
                  } else if (isSelected) {
                    cls = "bg-pink-500 border-pink-400 text-white shadow-lg";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={!!pendingResult}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between ${cls}`}
                    >
                      <span>
                        <span className="font-black mr-2 text-xs opacity-70">{["A", "B", "C"][i]}.</span>
                        {opt}
                      </span>
                      {revealed && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {revealed && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {pendingResult && (
                <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${pendingResult.correct ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
                  <div className="flex items-center gap-2">
                    {pendingResult.correct
                      ? <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                      : <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    }
                    <p className={`font-black text-sm ${pendingResult.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                      {pendingResult.correct ? "Correct! 🎉" : "Incorrect! ❌"}
                    </p>
                  </div>

                  {!pendingResult.correct && (
                    <p className="text-xs text-muted-foreground -mt-1">
                      Correct answer: <strong className="text-foreground">{pendingResult.correct_answer}</strong>
                    </p>
                  )}

                  {pendingResult.justification && (
                    <div className="bg-white/70 dark:bg-black/20 rounded-xl px-3 py-2.5 border border-border">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">💡 Why?</p>
                      <p className="text-sm text-foreground leading-relaxed">{pendingResult.justification}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleFinish}
                    disabled={finishing}
                    className={`w-full font-black tracking-wide ${pendingResult.correct ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-700 hover:bg-slate-800 text-white"}`}
                  >
                    {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Got it! See you tomorrow."}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}