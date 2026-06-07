import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MyQuizHistory from "./MyQuizHistory";

const BRUNEI_TZ = "Asia/Brunei";
const LAUNCH_DATE = new Date("2026-06-04T00:00:00+08:00");

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getCurrentCycleId() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const diffDays = Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  const cycleNumber = Math.max(0, Math.floor(diffDays / 5));
  return `Block_${cycleNumber}`;
}

function getDayOfCycle() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const diffDays = Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  return (diffDays % 5) + 1; // 1-5
}

function getCycleDates() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const diffDays = Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  const cycleStartDayOffset = Math.floor(diffDays / 5) * 5;
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(LAUNCH_DATE);
    d.setDate(d.getDate() + cycleStartDayOffset + i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ }));
  }
  return dates;
}

// ── Day Progress Pills ────────────────────────────────────────────────────────
function DayPills({ playerQuestionLog, currentDay, cycleDates }) {
  const logMap = new Map();
  playerQuestionLog.forEach(entry => { logMap.set(entry.date, entry); });

  return (
    <div className="flex gap-1.5 justify-center">
      {[0, 1, 2, 3, 4].map(idx => {
        const dayNumber = idx + 1;
        const date = cycleDates[idx];
        const logEntry = logMap.get(date);
        const isToday = dayNumber === currentDay;
        const hasAnswered = !!logEntry;
        const isCorrect = logEntry?.correct;

        let pillClass = "bg-muted border-border text-muted-foreground";
        if (isToday && !hasAnswered) pillClass = "bg-pink-100 dark:bg-pink-950/40 border-pink-400 text-pink-600 dark:text-pink-400 animate-pulse";
        if (hasAnswered && isCorrect) pillClass = "bg-emerald-400 border-emerald-500 text-white";
        if (hasAnswered && !isCorrect) pillClass = "bg-red-400 border-red-500 text-white";

        return (
          <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${pillClass}`}>
            {hasAnswered
              ? (isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />)
              : dayNumber
            }
          </div>
        );
      })}
    </div>
  );
}

// ── Partner Panel ─────────────────────────────────────────────────────────────
function PartnerPanel({ team, scoreRecord, userId }) {
  const isP1 = team.player1_id === userId;
  const partnerName = isP1 ? team.player2_name : team.player1_name;
  const partnerPrefix = isP1 ? "p2" : "p1";
  const partnerScore = scoreRecord?.[`${partnerPrefix}_score`] || 0;
  const partnerPlayedDates = JSON.parse(scoreRecord?.[`${partnerPrefix}_played_dates`] || "[]");
  const today = getBruneiDateString();
  const answeredToday = partnerPlayedDates.includes(today);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-200 dark:bg-violet-900 flex items-center justify-center text-xs font-black text-violet-700 dark:text-violet-300">
            {(partnerName || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{partnerName || "Partner"}</p>
            <p className="text-[10px] text-muted-foreground">your teamate</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${answeredToday ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-600 dark:text-amber-400"}`}>
            {answeredToday ? "✅ Answered today" : "⏳ Not yet today"}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Score</p>
            <p className="font-black text-base text-foreground">{partnerScore}/5</p>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        {[1, 2, 3, 4, 5].map(i => {
          const played = partnerPlayedDates.length >= i;
          const currentDay = getDayOfCycle();
          const isToday = i === currentDay;
          return (
            <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${
              played ? "bg-emerald-400 border-emerald-500 text-white"
              : isToday ? "bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-600 animate-pulse"
              : "bg-muted border-border text-muted-foreground"
            }`}>
              {i}
            </div>
          );
        })}
        <span className="ml-auto text-[10px] text-muted-foreground">{partnerPlayedDates.length}/5 days</span>
      </div>
    </div>
  );
}

// ── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({ team, scoreRecord, userId, onAnswered }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [pendingResult, setPendingResult] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const isP1 = team.player1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = JSON.parse(scoreRecord?.[`${playerPrefix}_played_dates`] || "[]");
  const alreadyPlayed = playedDates.includes(getBruneiDateString());
  const currentDay = getDayOfCycle(); // 1-5

  useEffect(() => {
    if (alreadyPlayed) { setLoadingQ(false); return; }
    // Use pre-assigned question for today's day index (0-based)
    const assignedKey = `${playerPrefix}_assigned_questions`;
    const assignedIds = JSON.parse(scoreRecord?.[assignedKey] || "[]");
    const todayQuestionId = assignedIds[currentDay - 1];
    if (todayQuestionId) {
      base44.entities.QuizQuestion.filter({ id: todayQuestionId }).then(results => {
        if (results.length > 0) setQuestion(results[0]);
        setLoadingQ(false);
      });
    } else {
      // Fallback: pick random if no pre-assignment (legacy)
      base44.entities.QuizQuestion.filter({ is_active: true }).then(questions => {
        if (questions.length > 0) {
          const random = questions[Math.floor(Math.random() * questions.length)];
          setQuestion(random);
        }
        setLoadingQ(false);
      });
    }
  }, [scoreRecord?.id, alreadyPlayed]);

  // Step 1: On answer click — evaluate locally, show result inline immediately (NO DB yet)
  const handleAnswerClick = (opt) => {
    if (pendingResult || !question) return;
    setSelected(opt);
    setPendingResult({
      correct: opt === question.correct_option,
      correct_answer: question.correct_option,
      justification: question.justification || null,
      selectedAnswer: opt,
    });
  };

  // Step 2: On "Got it!" — write to DB, THEN transition to locked screen
  const handleFinish = async () => {
    if (finishing || !pendingResult || !question) return;
    setFinishing(true);
    await base44.functions.invoke("duoSubmitAnswer", {
      score_id: scoreRecord.id,
      answer: pendingResult.selectedAnswer,
      question_id: question.id,
    });
    setFinishing(false);
    onAnswered();
  };

  // Already played today
  if (alreadyPlayed) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">You've answered today's question!</p>
        <p className="text-xs text-muted-foreground mt-1">Come back tomorrow for your next question.</p>
      </div>
    );
  }

  if (loadingQ) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!question) {
    return (
      <div className="bg-muted rounded-2xl p-4 text-center">
        <p className="text-sm text-muted-foreground">No active questions available. Ask your admin to add some!</p>
      </div>
    );
  }

  const options = [question.option_a, question.option_b, question.option_c];

  return (
    <div className="flex flex-col gap-3">
      {/* Question */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Day {currentDay} Question</p>
        <p className="font-bold text-foreground text-sm leading-relaxed">{question.question_text}</p>
      </div>

      {/* Answer options — locked after selection */}
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
            cls = "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-200/40 dark:shadow-pink-900/30";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswerClick(opt)}
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

      {/* Inline result + justification — shown after answer click, before DB write */}
      {pendingResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 flex flex-col gap-3 ${
            pendingResult.correct
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {pendingResult.correct
              ? <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
              : <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            }
            <p className={`font-black text-sm ${pendingResult.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
              {pendingResult.correct ? "Correct! 🎉 You earned a point for the team." : "Incorrect! ❌"}
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
            className={`w-full font-black tracking-wide ${
              pendingResult.correct
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-slate-700 hover:bg-slate-800 text-white"
            }`}
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Got it! See you tomorrow."}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ── Completed Screen ──────────────────────────────────────────────────────────
function CompletedScreen({ team, scoreRecord, userId, onClaimed }) {
  const isP1 = team.player1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const myScore = scoreRecord?.[`${playerPrefix}_score`] || 0;
  const partnerScore = scoreRecord?.[isP1 ? "p2_score" : "p1_score"] || 0;
  const teamScore = myScore + partnerScore;
  const isPerfect = teamScore === 10;
  const alreadyClaimed = scoreRecord?.[`${playerPrefix}_claimed`];
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claiming || alreadyClaimed) return;
    setClaiming(true);
    const currentTokens = (await base44.auth.me())?.earlyAccessTokens ?? 0;
    await base44.auth.updateMe({ earlyAccessTokens: currentTokens + 2 });
    await base44.entities.FiveDayScore.update(scoreRecord.id, {
      [`${playerPrefix}_claimed`]: true,
    });
    toast.success("+2 tokens claimed! 🎉");
    setClaiming(false);
    onClaimed();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl border p-5 text-center ${isPerfect ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700" : "bg-card border-border"}`}>
        {isPerfect && <div className="text-3xl mb-2">🏆</div>}
        <p className="font-black text-lg text-foreground">{isPerfect ? "Perfect Team Score!" : "Cycle Complete!"}</p>
        <p className="text-sm text-muted-foreground mt-1">5-day quiz challenge finished</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Your Score</p>
            <p className="font-black text-xl text-foreground">{myScore}/5</p>
          </div>
          <div className={`rounded-xl p-3 border-2 ${isPerfect ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400" : "bg-muted border-border"}`}>
            <p className="text-[10px] text-muted-foreground mb-1">Team Total</p>
            <p className={`font-black text-xl ${isPerfect ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{teamScore}/10</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Partner</p>
            <p className="font-black text-xl text-foreground">{partnerScore}/5</p>
          </div>
        </div>
      </div>

      {isPerfect && !alreadyClaimed && (
        <Button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black tracking-widest uppercase shadow-lg shadow-amber-500/25"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4 mr-1" /> Claim +2 Tokens</>}
        </Button>
      )}
      {isPerfect && alreadyClaimed && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅ Reward claimed!
        </div>
      )}

      <div className="bg-muted border border-border rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          🎉 Cycle complete! The next 5-day block starts automatically.
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyDuoGame({ user, onUserUpdate }) {
  const [team, setTeam] = useState(null);
  const [scoreRecord, setScoreRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const cycleId = getCurrentCycleId();

    const [asP1, asP2] = await Promise.all([
      base44.entities.DuoTeam.filter({ player1_id: user.id }),
      base44.entities.DuoTeam.filter({ player2_id: user.id }),
    ]);
    const foundTeam = asP1[0] || asP2[0] || null;
    setTeam(foundTeam);

    if (foundTeam) {
      const existingScores = await base44.entities.FiveDayScore.filter({ cycle_id: cycleId, team_id: foundTeam.id });
      if (existingScores.length > 0) {
        setScoreRecord(existingScores[0]);
      } else {
        // Pre-assign 5 unique questions for each player
        const allQuestions = await base44.entities.QuizQuestion.filter({ is_active: true });
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const shuffled = shuffle(allQuestions);
        const p1Qs = shuffled.slice(0, 5).map(q => q.id);
        const p2Qs = shuffle(allQuestions).slice(0, 5).map(q => q.id);
        const newRecord = await base44.entities.FiveDayScore.create({
          cycle_id: cycleId,
          team_id: foundTeam.id,
          p1_score: 0,
          p2_score: 0,
          p1_played_dates: "[]",
          p2_played_dates: "[]",
          p1_claimed: false,
          p2_claimed: false,
          p1_assigned_questions: JSON.stringify(p1Qs),
          p2_assigned_questions: JSON.stringify(p2Qs),
        });
        setScoreRecord(newRecord);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user.id]);

  useEffect(() => {
    const unsub = base44.entities.FiveDayScore.subscribe(() => { loadData(); });
    return unsub;
  }, [user.id]);

  // Called only after user dismisses the result screen
  const handleAnswered = async () => { await loadData(); };
  const handleClaimed = async () => { await loadData(); await onUserUpdate(); };

  const isP1 = team?.player1_id === user.id;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = scoreRecord ? JSON.parse(scoreRecord[`${playerPrefix}_played_dates`] || "[]") : [];
  const myScore = scoreRecord?.[`${playerPrefix}_score`] || 0;
  const currentDay = getDayOfCycle();
  const allDaysPlayed = playedDates.length >= 5;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧠</span>
          <h3 className="font-black text-base text-foreground">Daily Quiz</h3>
          <span className="ml-auto text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full">5-Day Co-Op</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-2 mt-1">
          <p className="font-medium text-foreground">Rotate partners monthly and win together! 🤝</p>
          <div className="space-y-1 bg-muted/20 p-2 rounded-md border border-border/50">
            <p>🎯 <span className="font-medium text-foreground">minimum of 5 correct answers together</span></p>
            <p>= <span className="font-bold text-amber-500"> 1 Token </span><span className="font-medium text-foreground">each</span></p>
            <p>🏆 <span className="font-medium text-foreground">10 correct answers</span> = <span className="font-bold text-amber-500">2 Tokens </span><span className="font-medium text-foreground">each</span></p>
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

      {!loading && !team && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">⏳</span>
          <p className="font-bold text-sm text-foreground">Your admin is setting up your team.</p>
          <p className="text-xs text-muted-foreground">Check back soon — you'll be paired with a partner shortly!</p>
        </div>
      )}

      {!loading && team && !allDaysPlayed && (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Your Progress</p>
                <p className="text-[10px] text-muted-foreground">Day {currentDay} of 5</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Your Score</p>
                <p className="font-black text-lg text-foreground">{myScore}/5</p>
              </div>
            </div>
            <DayPills playerQuestionLog={JSON.parse(scoreRecord?.[`${playerPrefix}_question_log`] || "[]")} currentDay={currentDay} cycleDates={getCycleDates()} />
          </div>
          <PartnerPanel team={team} scoreRecord={scoreRecord} userId={user.id} />
          <QuizCard team={team} scoreRecord={scoreRecord} userId={user.id} onAnswered={handleAnswered} />
        </>
      )}

      {!loading && team && allDaysPlayed && (
        <CompletedScreen team={team} scoreRecord={scoreRecord} userId={user.id} onClaimed={handleClaimed} />
      )}

      {!loading && team && (
        <MyQuizHistory user={user} />
      )}
    </div>
  );
}