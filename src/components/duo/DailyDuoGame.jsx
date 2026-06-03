import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getCycleStartDate() {
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getDayIndex(cycleStartDate) {
  const start = new Date(cycleStartDate + "T00:00:00+08:00");
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

// ── Day Progress Pills ────────────────────────────────────────────────────────
function DayPills({ playedDates, cycleStartDate }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const dayDate = (() => {
          const d = new Date(cycleStartDate + "T00:00:00+08:00");
          d.setDate(d.getDate() + i);
          return d.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
        })();
        const played = playedDates.includes(dayDate);
        const today = getBruneiDateString() === dayDate;
        return (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
            played ?
            "bg-emerald-400 border-emerald-500 text-white" :
            today ?
            "bg-pink-100 dark:bg-pink-950/40 border-pink-400 text-pink-600 dark:text-pink-400 animate-pulse" :
            "bg-muted border-border text-muted-foreground"}`
            }>
            
            {i + 1}
          </div>);

      })}
    </div>);

}

// ── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({ match, userId, onAnswered }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isP1 = match.p1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = JSON.parse(match[`${playerPrefix}_played_dates`] || "[]");
  const questionIds = JSON.parse(match[`${playerPrefix}_question_ids`] || "[]");
  const dayIndex = getDayIndex(match.cycle_start_date);
  const alreadyPlayed = playedDates.includes(getBruneiDateString());

  useEffect(() => {
    if (alreadyPlayed || dayIndex < 0 || dayIndex > 4) return;
    const qid = questionIds[dayIndex];
    if (!qid) return;
    base44.entities.QuizQuestion.filter({ id: qid }).then((results) => {
      if (results.length > 0) setQuestion(results[0]);
    });
  }, [match.id, dayIndex]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const res = await base44.functions.invoke("duoSubmitAnswer", {
      match_id: match.id,
      answer: selected
    });
    const data = res.data;
    setResult({ correct: data.correct, correct_answer: data.correct_answer });
    setSubmitting(false);
    onAnswered(data);
  };

  if (alreadyPlayed) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">You've answered today's question!</p>
        <p className="text-xs text-muted-foreground mt-1">Come back tomorrow for your next question.</p>
      </div>);

  }

  if (dayIndex < 0 || dayIndex > 4) {
    return (
      <div className="bg-muted rounded-2xl p-4 text-center">
        <p className="text-sm text-muted-foreground">No question available today.</p>
      </div>);

  }

  if (!question) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>);

  }

  const options = [question.option_a, question.option_b, question.option_c];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Day {dayIndex + 1} Question</p>
        <p className="font-bold text-foreground text-sm leading-relaxed">{question.question_text}</p>
      </div>

      {!result ?
      <div className="flex flex-col gap-2">
          {options.map((opt, i) =>
        <button
          key={i}
          onClick={() => setSelected(opt)}
          disabled={submitting}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
          selected === opt ?
          "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-200/40 dark:shadow-pink-900/30" :
          "bg-card border-border text-foreground hover:bg-muted"}`
          }>
          
              <span className="font-black mr-2 text-xs opacity-70">{["A", "B", "C"][i]}.</span>
              {opt}
            </button>
        )}
          <Button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full mt-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black tracking-widest uppercase hover:from-pink-400 hover:to-rose-400 shadow-lg shadow-pink-500/25">
          
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Answer"}
          </Button>
        </div> :

      <AnimatePresence>
          <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-4 text-center border ${
          result.correct ?
          "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" :
          "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`
          }>
          
            {result.correct ?
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1" /> :
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-1" />
          }
            <p className={`font-black text-sm ${result.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
              {result.correct ? "Correct! +1 to your score 🎉" : "Not quite!"}
            </p>
            {!result.correct &&
          <p className="text-xs text-muted-foreground mt-1">Correct answer: <strong>{result.correct_answer}</strong></p>
          }
          </motion.div>
        </AnimatePresence>
      }
    </div>);

}

// ── Completed / Score Screen ──────────────────────────────────────────────────
function CompletedScreen({ match, userId, onClaimed }) {
  const isP1 = match.p1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const myScore = match[`${playerPrefix}_score`] || 0;
  const partnerScore = match[isP1 ? "p2_score" : "p1_score"] || 0;
  const teamScore = myScore + partnerScore;
  const isPerfect = teamScore === 10;
  const alreadyClaimed = match[`${playerPrefix}_claimed`];
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claiming || alreadyClaimed) return;
    setClaiming(true);
    const currentTokens = (await base44.auth.me())?.earlyAccessTokens ?? 0;
    await base44.auth.updateMe({ earlyAccessTokens: currentTokens + 2 });
    await base44.entities.DuoMatchCycle.update(match.id, {
      [`${playerPrefix}_claimed`]: true
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

      {isPerfect && !alreadyClaimed &&
      <Button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black tracking-widest uppercase shadow-lg shadow-amber-500/25">
        
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4 mr-1" /> Claim +2 Tokens</>}
        </Button>
      }
      {isPerfect && alreadyClaimed &&
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅ Reward claimed!
        </div>
      }

      <div className="bg-muted border border-border rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          🎉 Cycle complete! New random pairings are generated automatically at the start of every 5-day cycle.
        </p>
      </div>
    </div>);

}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyDuoGame({ user, onUserUpdate }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const cycleStartDate = getCycleStartDate();

  const loadMatch = async () => {
    setLoading(true);
    const [asP1, asP2] = await Promise.all([
    base44.entities.DuoMatchCycle.filter({ p1_id: user.id, cycle_start_date: cycleStartDate }),
    base44.entities.DuoMatchCycle.filter({ p2_id: user.id, cycle_start_date: cycleStartDate })]
    );
    const found = asP1[0] || asP2[0] || null;
    setMatch(found);
    setLoading(false);
  };

  useEffect(() => {
    loadMatch();
  }, [user.id, cycleStartDate]);

  useEffect(() => {
    const unsub = base44.entities.DuoMatchCycle.subscribe(() => {
      loadMatch();
    });
    return unsub;
  }, [user.id, cycleStartDate]);

  const handleAnswered = async (data) => {
    await loadMatch();
    if (data.cycle_complete) toast.success("5-day cycle complete! Check your team score.");
  };

  const handleClaimed = async () => {
    await loadMatch();
    await onUserUpdate();
  };

  const isP1 = match?.p1_id === user.id;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = match ? JSON.parse(match[`${playerPrefix}_played_dates`] || "[]") : [];
  const myScore = match?.[`${playerPrefix}_score`] || 0;
  const partnerName = match ? isP1 ? match.p2_name : match.p1_name : null;
  const dayIndex = match ? getDayIndex(match.cycle_start_date) : -1;
  const allDaysPlayed = playedDates.length >= 5;

  return (
    <div className="flex flex-col gap-3">
      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧠</span>
          <h3 className="font-black text-base text-foreground">Daily Quiz</h3>
          <span className="ml-auto text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full">5-Day Co-Op</span>
        </div>
        <p className="text-xs text-muted-foreground">Matched with a partner for 1 daily question.• Score 5/10 together = 1 Token • Flawless 10/10 = 2 Tokens!


        </p>
      </div>

      {/* Loading */}
      {loading && <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>}

      {/* No match yet (teams not generated yet) */}
      {!loading && !match && <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">⏳</span>
          <div>
            <p className="font-bold text-sm text-foreground">Teams Not Assigned Yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pairings for this cycle haven't been generated yet. Check back soon — your admin will kick off the new round shortly!
            </p>
          </div>
        </div>
      }

      {/* Active */}
      {!loading && match?.status === "active" && !allDaysPlayed &&
      <>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-200 dark:bg-pink-900 flex items-center justify-center text-xs font-black text-pink-700 dark:text-pink-300">
                  {(partnerName || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Partner: {partnerName || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">Day {Math.min(dayIndex + 1, 5)} of 5</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Your Score</p>
                <p className="font-black text-lg text-foreground">{myScore}/5</p>
              </div>
            </div>
            <DayPills playedDates={playedDates} cycleStartDate={match.cycle_start_date} />
          </div>
          <QuizCard match={match} userId={user.id} onAnswered={handleAnswered} />
        </>
      }

      {/* Completed or all days played */}
      {!loading && match && (match?.status === "completed" || allDaysPlayed) &&
      <CompletedScreen match={match} userId={user.id} onClaimed={handleClaimed} />
      }
    </div>);

}