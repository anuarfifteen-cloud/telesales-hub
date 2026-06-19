import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getYesterdayBrunei() {
  const now = new Date();
  const bruneiNow = new Date(now.toLocaleString("en-US", { timeZone: BRUNEI_TZ }));
  bruneiNow.setDate(bruneiNow.getDate() - 1);
  return bruneiNow.toLocaleDateString("en-CA");
}

// ── LocalStorage helpers ──────────────────────────────────────────────────────
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

function getStreak() {
  const raw = localStorage.getItem("solo_quiz_streak");
  return raw ? JSON.parse(raw) : { count: 0, lastCorrectDate: null };
}

function saveStreak(data) {
  localStorage.setItem("solo_quiz_streak", JSON.stringify(data));
}

function getLastSeenId() {
  return localStorage.getItem("solo_quiz_last_id") || null;
}

function saveLastSeenId(id) {
  localStorage.setItem("solo_quiz_last_id", id);
}

// ── Streak Pills ──────────────────────────────────────────────────────────────
function StreakPills({ streak, answeredToday, correct }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">5-Day Streak</span>
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{streak.count}/5</span>
      </div>
      <div className="flex gap-1.5 justify-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const isFilled = i < streak.count;
          const isToday = i === streak.count && answeredToday;
          const isTodayCorrect = isToday && correct;

          let cls = "bg-muted border-border text-muted-foreground";
          if (isFilled) cls = "bg-emerald-400 border-emerald-500 text-white";
          else if (isToday && correct === true) cls = "bg-emerald-400 border-emerald-500 text-white";
          else if (isToday && correct === false) cls = "bg-red-400 border-red-500 text-white";
          else if (i === streak.count && !answeredToday) cls = "bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-600 animate-pulse";

          return (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${cls}`}
            >
              {isFilled || (isToday && correct) ? <CheckCircle className="w-4 h-4" /> : (isToday && correct === false) ? <XCircle className="w-4 h-4" /> : i + 1}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        ⚠️ A wrong answer or missed day resets your streak to zero
      </p>
    </div>
  );
}

// ── Already Answered Card ─────────────────────────────────────────────────────
function AlreadyAnsweredCard({ record, streak }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${record.correct ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
      <div className="flex items-center gap-2">
        {record.correct
          ? <CheckCircle className="w-6 h-6 text-emerald-500" />
          : <XCircle className="w-6 h-6 text-red-500" />
        }
        <p className={`font-black text-sm ${record.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
          {record.correct ? "✅ Correct! Well done." : "❌ Incorrect today."}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Current streak: <strong className="text-foreground">{streak.count}</strong> day{streak.count !== 1 ? "s" : ""}
        {streak.count === 0 ? " — keep going tomorrow!" : streak.count >= 4 ? " — one more for reward! 🔥" : ""}
      </p>
      <p className="text-xs text-muted-foreground">Come back tomorrow for your next question.</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyDuoGame({ user, onUserUpdate }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [streak, setStreak] = useState(() => getStreak());
  const [todayRecord, setTodayRecord] = useState(() => getTodayRecord());

  useEffect(() => {
    const alreadyAnswered = getTodayRecord();
    if (alreadyAnswered) {
      setTodayRecord(alreadyAnswered);
      setLoading(false);
      return;
    }

    // Pick a random active question, excluding last seen
    base44.entities.QuizQuestion.filter({ is_active: true }).then((questions) => {
      if (!questions.length) { setLoading(false); return; }
      const lastId = getLastSeenId();
      const pool = questions.length > 1 ? questions.filter(q => q.id !== lastId) : questions;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setQuestion(picked);
      setLoading(false);
    });
  }, []);

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
    const yesterday = getYesterdayBrunei();
    const isCorrect = pendingResult.correct;

    // Compute new streak
    const currentStreak = getStreak();
    let newStreak = { ...currentStreak };

    // Check if streak is still continuous
    if (currentStreak.lastCorrectDate !== yesterday && currentStreak.lastCorrectDate !== null) {
      // Missed a day — reset first
      newStreak = { count: 0, lastCorrectDate: null };
    }

    if (isCorrect) {
      newStreak.count = (newStreak.count || 0) + 1;
      newStreak.lastCorrectDate = today;
    } else {
      newStreak.count = 0;
      newStreak.lastCorrectDate = null;
    }

    saveStreak(newStreak);
    setStreak(newStreak);

    // Save today's record
    const record = { answered: true, correct: isCorrect, questionId: question.id };
    saveTodayRecord(record);
    setTodayRecord(record);
    saveLastSeenId(question.id);

    // Award tokens if streak just hit 5
    if (newStreak.count >= 5) {
      const freshUser = await base44.auth.me();
      const currentTokens = freshUser?.earlyAccessTokens ?? 0;
      await base44.auth.updateMe({ earlyAccessTokens: currentTokens + 2 });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
        amount: 2,
        source: "Daily Quiz — 5-Day Streak",
        timestamp: new Date().toISOString(),
      });
      saveStreak({ count: 0, lastCorrectDate: null });
      setStreak({ count: 0, lastCorrectDate: null });
      toast.success("+2 Tokens! 🎉 Streak Complete!");
    }

    await onUserUpdate();
    setFinishing(false);
  };

  const options = question ? [question.option_a, question.option_b, question.option_c] : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧠</span>
          <h3 className="font-black text-base text-foreground">Daily Quiz</h3>
          <span className="ml-auto text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full">Solo Daily</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 mt-1">
          <p className="font-medium text-foreground">Answer 1 question per day, build a 5-day streak!</p>
          <div className="bg-muted/20 p-2 rounded-md border border-border/50">
            <p>🔥 <span className="font-medium text-foreground">5-day streak</span> = <span className="font-bold text-amber-500">+2 Tokens</span></p>
          </div>
        </div>
      </div>

      {/* Streak Pills */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <StreakPills
          streak={streak}
          answeredToday={!!todayRecord}
          correct={todayRecord?.correct ?? null}
        />
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex gap-2.5 items-start">
        <span className="text-base text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
        <div className="text-xs space-y-0.5">
          <p className="font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">Important Rule</p>
          <p className="text-muted-foreground font-medium leading-relaxed">
            A wrong answer or missed day <span className="text-foreground font-bold underline decoration-amber-500">resets your streak to zero</span>.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && todayRecord && (
        <AlreadyAnsweredCard record={todayRecord} streak={streak} />
      )}

      {!loading && !todayRecord && !question && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">📭</span>
          <p className="font-bold text-sm text-foreground">No active questions available.</p>
          <p className="text-xs text-muted-foreground">Ask your admin to add some quiz questions!</p>
        </div>
      )}

      {!loading && !todayRecord && question && (
        <div className="flex flex-col gap-3">
          {/* Question */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Today's Question</p>
            <p className="font-bold text-foreground text-sm leading-relaxed">{question.question_text}</p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => {
              const isSelected = selected === opt;
              const isCorrect = opt === question.correct_option;
              const revealed = !!pendingResult;

              let cls = "bg-card border-border text-foreground hover:bg-muted";
              if (revealed) {
                if (isCorrect) cls = "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold";
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
                  {revealed && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Result reveal */}
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
    </div>
  );
}