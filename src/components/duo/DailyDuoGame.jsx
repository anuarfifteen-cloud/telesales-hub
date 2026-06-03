import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

// ── Day Progress Pills ────────────────────────────────────────────────────────
function DayPills({ playedCount, currentDay }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
            i < currentDay && playedCount >= i
              ? "bg-emerald-400 border-emerald-500 text-white"
              : i === currentDay
              ? "bg-pink-100 dark:bg-pink-950/40 border-pink-400 text-pink-600 dark:text-pink-400 animate-pulse"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          {i}
        </div>
      ))}
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
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingQ, setLoadingQ] = useState(true);

  const isP1 = team.player1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = JSON.parse(scoreRecord?.[`${playerPrefix}_played_dates`] || "[]");
  const alreadyPlayed = playedDates.includes(getBruneiDateString());

  useEffect(() => {
    if (alreadyPlayed) { setLoadingQ(false); return; }
    // Fetch one random active question
    base44.entities.QuizQuestion.filter({ is_active: true }).then(questions => {
      if (questions.length > 0) {
        const random = questions[Math.floor(Math.random() * questions.length)];
        setQuestion(random);
      }
      setLoadingQ(false);
    });
  }, [scoreRecord?.id]);

  const handleSubmit = async () => {
    if (!selected || submitting || !question) return;
    setSubmitting(true);
    const res = await base44.functions.invoke("duoSubmitAnswer", {
      score_id: scoreRecord.id,
      answer: selected,
      question_id: question.id,
    });
    const data = res.data;
    setResult({
      correct: data.correct,
      correct_answer: data.correct_answer,
      justification: data.justification,
      new_score: data.new_score,
    });
    setSubmitting(false);
    onAnswered(data);
  };

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
  const currentDay = getDayOfCycle();

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Day {currentDay} Question</p>
        <p className="font-bold text-foreground text-sm leading-relaxed">{question.question_text}</p>
      </div>

      {!result ? (
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(opt)}
              disabled={submitting}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selected === opt
                  ? "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-200/40 dark:shadow-pink-900/30"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              <span className="font-black mr-2 text-xs opacity-70">{["A", "B", "C"][i]}.</span>
              {opt}
            </button>
          ))}
          <Button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="w-full mt-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black tracking-widest uppercase hover:from-pink-400 hover:to-rose-400 shadow-lg shadow-pink-500/25"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Answer"}
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-4 border flex flex-col gap-2 ${
              result.correct
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              {result.correct
                ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                : <XCircle className="w-8 h-8 text-red-500" />
              }
              <p className={`font-black text-sm ${result.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                {result.correct ? "Correct! +1 to your score 🎉" : "Not quite!"}
              </p>
              {!result.correct && (
                <p className="text-xs text-muted-foreground">Correct answer: <strong className="text-foreground">{result.correct_answer}</strong></p>
              )}
            </div>
            {result.justification && (
              <div className="bg-muted rounded-xl px-3 py-2 mt-1">
                <p className="text-[11px] text-muted-foreground italic">💡 {result.justification}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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

    // Find the user's permanent team
    const [asP1, asP2] = await Promise.all([
      base44.entities.DuoTeam.filter({ player1_id: user.id }),
      base44.entities.DuoTeam.filter({ player2_id: user.id }),
    ]);
    const foundTeam = asP1[0] || asP2[0] || null;
    setTeam(foundTeam);

    if (foundTeam) {
      // Find or create score record for this cycle
      const existingScores = await base44.entities.FiveDayScore.filter({ cycle_id: cycleId, team_id: foundTeam.id });
      if (existingScores.length > 0) {
        setScoreRecord(existingScores[0]);
      } else {
        // Auto-create for this new block
        const newRecord = await base44.entities.FiveDayScore.create({
          cycle_id: cycleId,
          team_id: foundTeam.id,
          p1_score: 0,
          p2_score: 0,
          p1_played_dates: "[]",
          p2_played_dates: "[]",
          p1_claimed: false,
          p2_claimed: false,
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
        <p className="text-xs text-muted-foreground">Team up and answer daily! Hit a flawless 10/10 for 2 Tokens!</p>
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
                <p className="text-[10px] text-muted-foreground">Day {currentDay} of 5 • {getCurrentCycleId()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Your Score</p>
                <p className="font-black text-lg text-foreground">{myScore}/5</p>
              </div>
            </div>
            <DayPills playedCount={playedDates.length} currentDay={currentDay} />
          </div>
          <PartnerPanel team={team} scoreRecord={scoreRecord} userId={user.id} />
          <QuizCard team={team} scoreRecord={scoreRecord} userId={user.id} onAnswered={handleAnswered} />
        </>
      )}

      {!loading && team && allDaysPlayed && (
        <CompletedScreen team={team} scoreRecord={scoreRecord} userId={user.id} onClaimed={handleClaimed} />
      )}
    </div>
  );
}