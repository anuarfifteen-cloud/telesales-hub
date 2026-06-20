import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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

function StreakPills({ filledDots, activeDotIndex, activeDotCorrect, answeredToday }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">5-Day Streak</span>
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{filledDots}/5</span>
      </div>
      <div className="flex gap-1.5 justify-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const isFilled = i < filledDots;
          const isActive = i === activeDotIndex && answeredToday;
          const isPending = i === activeDotIndex && !answeredToday;

          let cls = "bg-muted border-border text-muted-foreground";
          if (isFilled) cls = "bg-emerald-400 border-emerald-500 text-white";
          else if (isActive && activeDotCorrect === true) cls = "bg-emerald-400 border-emerald-500 text-white";
          else if (isActive && activeDotCorrect === false) cls = "bg-red-400 border-red-500 text-white";
          else if (isPending) cls = "bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-600 animate-pulse";

          return (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${cls}`}
            >
              {isFilled ? <CheckCircle className="w-4 h-4" /> :
               isActive && activeDotCorrect === true ? <CheckCircle className="w-4 h-4" /> :
               isActive && activeDotCorrect === false ? <XCircle className="w-4 h-4" /> :
               i + 1}
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

function AlreadyAnsweredCard({ record, streakRecord }) {
  const count = streakRecord?.streak_count ?? 0;
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
        Current streak: <strong className="text-foreground">{count}</strong> day{count !== 1 ? "s" : ""}
        {count === 0 ? " — keep going tomorrow!" : count >= 4 ? " — one more for reward! 🔥" : ""}
      </p>
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
  const [streakRecord, setStreakRecord] = useState(null);
  const [todayRecord, setTodayRecord] = useState(() => getTodayRecord());
  const [quizEnabled, setQuizEnabled] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      const settings = await base44.entities.AppSettings.list();
      if (settings[0]?.quiz_enabled === false) {
        setQuizEnabled(false);
        setLoading(false);
        return;
      }

      const records = await base44.entities.QuizStreak.filter({ user_id: user.id });
      const dbStreak = records[0] || null;
      setStreakRecord(dbStreak);

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
    const yesterday = getYesterdayBrunei();
    const isCorrect = pendingResult.correct;

    const current = streakRecord;
    let newCount = 0;
    let newLastCorrectDate = null;
    let newRewardPaid = current?.reward_paid_for_cycle ?? false;

    if (isCorrect) {
      const wasConsecutive = current?.last_correct_date === yesterday;
      newCount = wasConsecutive ? (current.streak_count || 0) + 1 : 1;
      newLastCorrectDate = today;
    } else {
      newCount = 0;
      newLastCorrectDate = null;
      newRewardPaid = false;
    }

    const opts = [question.option_a, question.option_b, question.option_c];
    const selectedOptionLetter = ["A", "B", "C"][opts.indexOf(pendingResult.selectedAnswer)] ?? "";

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
      const localRecord = { answered: true, correct: isCorrect, questionId: question.id, duplicate: true };
      saveTodayRecord(localRecord);
      setTodayRecord(localRecord);
      toast.error("You've already answered today's question. Come back tomorrow! 🌙");
      setFinishing(false);
      return;
    }

    const shouldReward = newCount >= 5 && !newRewardPaid;
    if (shouldReward) newRewardPaid = true;

    const streakPayload = {
      streak_count: newCount,
      last_correct_date: newLastCorrectDate,
      reward_paid_for_cycle: newRewardPaid,
    };

    let updatedRecord;
    if (current?.id) {
      updatedRecord = await base44.entities.QuizStreak.update(current.id, streakPayload);
    } else {
      updatedRecord = await base44.entities.QuizStreak.create({ user_id: user.id, ...streakPayload });
    }

    setStreakRecord(updatedRecord);

    setTimeout(async () => {
      const fresh = await base44.entities.QuizStreak.filter({ user_id: user.id });
      if (fresh?.[0]) setStreakRecord(fresh[0]);
    }, 500);

    if (shouldReward) {
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
      toast.success("+2 Tokens! 🎉 Streak Complete!");

      const resetPayload = { streak_count: 0, last_correct_date: null, reward_paid_for_cycle: false };
      const resetRecord = await base44.entities.QuizStreak.update(updatedRecord.id, resetPayload);
      setStreakRecord(resetRecord);
    }

    const localRecord = { answered: true, correct: isCorrect, questionId: question.id };
    saveTodayRecord(localRecord);
    setTodayRecord(localRecord);
    saveLastSeenId(question.id);

    await onUserUpdate();
    setFinishing(false);
  };

  const options = question ? [question.option_a, question.option_b, question.option_c] : [];
  const streakCount = streakRecord?.streak_count ?? 0;

  return (
    <div className="flex flex-col gap-3">

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Maintenance Mode — ONLY this, nothing else */}
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
              filledDots={streakCount}
              activeDotIndex={streakCount}
              activeDotCorrect={todayRecord?.correct ?? null}
              answeredToday={!!todayRecord}
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

          {/* Already answered today */}
          {todayRecord && (
            <AlreadyAnsweredCard record={todayRecord} streakRecord={streakRecord} />
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