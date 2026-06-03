import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Trophy, CheckCircle, XCircle, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getDayIndex(cycleStartDate) {
  const start = new Date(cycleStartDate + "T00:00:00+08:00");
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

// ── Waiting Screen ────────────────────────────────────────────────────────────
function WaitingScreen({ onCancel }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center border-2 border-pink-300 dark:border-pink-700"
      >
        <Users className="w-8 h-8 text-pink-500" />
      </motion.div>
      <div>
        <p className="font-black text-lg text-foreground">Finding your Duo Partner…</p>
        <p className="text-xs text-muted-foreground mt-1">You're in the queue! As soon as someone joins, your 5-day challenge begins.</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-pink-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.4 }}
          />
        ))}
      </div>
      <button onClick={onCancel} className="text-xs text-muted-foreground underline hover:text-foreground">Leave queue</button>
    </div>
  );
}

// ── Day Progress Pills ────────────────────────────────────────────────────────
function DayPills({ playedDates, cycleStartDate, score }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {[0, 1, 2, 3, 4].map(i => {
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
              played
                ? "bg-emerald-400 border-emerald-500 text-white"
                : today
                ? "bg-pink-100 dark:bg-pink-950/40 border-pink-400 text-pink-600 dark:text-pink-400 animate-pulse"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

// ── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({ match, userId, onAnswered }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { correct, correct_answer }

  const isP1 = match.p1_id === userId;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = JSON.parse(match[`${playerPrefix}_played_dates`] || "[]");
  const questionIds = JSON.parse(match[`${playerPrefix}_question_ids`] || "[]");
  const dayIndex = getDayIndex(match.cycle_start_date);
  const alreadyPlayed = playedDates.includes(getBruneiDateString());
  const score = match[`${playerPrefix}_score`] || 0;

  useEffect(() => {
    if (alreadyPlayed || dayIndex < 0 || dayIndex > 4) return;
    const qid = questionIds[dayIndex];
    if (!qid) return;
    base44.entities.QuizQuestion.filter({ id: qid }).then(results => {
      if (results.length > 0) setQuestion(results[0]);
    });
  }, [match.id, dayIndex]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const res = await base44.functions.invoke("duoSubmitAnswer", {
      match_id: match.id,
      answer: selected,
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
      </div>
    );
  }

  if (dayIndex < 0 || dayIndex > 4) {
    return (
      <div className="bg-muted rounded-2xl p-4 text-center">
        <p className="text-sm text-muted-foreground">No question available today.</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const options = [question.option_a, question.option_b, question.option_c];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Day {dayIndex + 1} Question</p>
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
            className={`rounded-2xl p-4 text-center border ${
              result.correct
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            }`}
          >
            {result.correct ? (
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-1" />
            )}
            <p className={`font-black text-sm ${result.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
              {result.correct ? "Correct! +1 to your score 🎉" : "Not quite!"}
            </p>
            {!result.correct && (
              <p className="text-xs text-muted-foreground mt-1">Correct answer: <strong>{result.correct_answer}</strong></p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
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
        <p className="text-sm text-muted-foreground mt-1">5-day duo challenge finished</p>

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
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyDuoGame({ user, onUserUpdate }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadMatch = async () => {
    // Check for any active/waiting/completed match
    const asP1Active = await base44.entities.DuoMatchCycle.filter({ p1_id: user.id, status: "active" });
    const asP2Active = await base44.entities.DuoMatchCycle.filter({ p2_id: user.id, status: "active" });
    const asP1Wait = await base44.entities.DuoMatchCycle.filter({ p1_id: user.id, status: "waiting" });
    const asP1Done = await base44.entities.DuoMatchCycle.filter({ p1_id: user.id, status: "completed" });
    const asP2Done = await base44.entities.DuoMatchCycle.filter({ p2_id: user.id, status: "completed" });

    const found = asP1Active[0] || asP2Active[0] || asP1Wait[0] || asP1Done[0] || asP2Done[0];
    setMatch(found || null);
    setLoading(false);
  };

  useEffect(() => {
    loadMatch();
  }, [user.id]);

  const handleJoin = async () => {
    setJoining(true);
    const res = await base44.functions.invoke("duoMatchmake", {});
    const data = res.data;
    if (data.error) {
      toast.error(data.error);
    } else {
      setMatch(data.match);
    }
    setJoining(false);
  };

  const handleLeaveQueue = async () => {
    if (!match) return;
    await base44.entities.DuoMatchCycle.delete(match.id);
    setMatch(null);
  };

  const handleAnswered = async (data) => {
    await loadMatch();
    if (data.cycle_complete) toast.success("5-day cycle complete! Check your team score.");
  };

  const handleClaimed = async () => {
    await loadMatch();
    await onUserUpdate();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isP1 = match?.p1_id === user.id;
  const playerPrefix = isP1 ? "p1" : "p2";
  const playedDates = match ? JSON.parse(match[`${playerPrefix}_played_dates`] || "[]") : [];
  const myScore = match?.[`${playerPrefix}_score`] || 0;
  const partnerName = match ? (isP1 ? match.p2_name : match.p1_name) : null;
  const dayIndex = match ? getDayIndex(match.cycle_start_date) : -1;

  return (
    <div className="flex flex-col gap-3">
      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤝</span>
          <h3 className="font-black text-base text-foreground">Daily Duo</h3>
          <span className="ml-auto text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full">5-Day Co-Op</span>
        </div>
        <p className="text-xs text-muted-foreground">Get matched with a partner. Answer 1 question daily. Score 10/10 together to earn tokens!</p>
      </div>

      {/* No match yet */}
      {!match && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center border-2 border-pink-200 dark:border-pink-700">
            <Users className="w-8 h-8 text-pink-500" />
          </div>
          <div>
            <p className="font-black text-base text-foreground">Ready to find your Duo?</p>
            <p className="text-xs text-muted-foreground mt-1">You'll be matched with a partner. Both get unique daily questions over 5 days. Score a perfect <strong>10/10</strong> together to earn <strong>2 tokens each</strong>!</p>
          </div>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black tracking-widest uppercase shadow-lg shadow-pink-500/25"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "🤝 Find a Duo Partner"}
          </Button>
        </div>
      )}

      {/* Waiting */}
      {match?.status === "waiting" && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <WaitingScreen onCancel={handleLeaveQueue} />
        </div>
      )}

      {/* Active */}
      {match?.status === "active" && (
        <>
          {/* Partner & progress bar */}
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
            <DayPills playedDates={playedDates} cycleStartDate={match.cycle_start_date} score={myScore} />
          </div>

          {/* Quiz card */}
          <QuizCard match={match} userId={user.id} onAnswered={handleAnswered} />
        </>
      )}

      {/* Completed */}
      {match?.status === "completed" && (
        <CompletedScreen match={match} userId={user.id} onClaimed={handleClaimed} />
      )}
    </div>
  );
}