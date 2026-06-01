import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_DATE_KEY = "perfect10_date";
const STORAGE_PLAYS_KEY = "perfect10_plays";
const FREE_PLAYS_PER_DAY = 3;

function getTodayString() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function getPlaysToday() {
  const stored = localStorage.getItem(STORAGE_DATE_KEY);
  const today = getTodayString();
  if (stored !== today) {
    localStorage.setItem(STORAGE_DATE_KEY, today);
    localStorage.setItem(STORAGE_PLAYS_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(STORAGE_PLAYS_KEY) ?? "0", 10);
}

function incrementPlays() {
  const current = getPlaysToday();
  const next = current + 1;
  localStorage.setItem(STORAGE_PLAYS_KEY, String(next));
  localStorage.setItem(STORAGE_DATE_KEY, getTodayString());
  return next;
}

export default function PerfectTen({ user, onUserUpdate }) {
  const [playsToday, setPlaysToday] = useState(() => getPlaysToday());
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState(null); // null | { type, message, time }
  const [isFreePlay, setIsFreePlay] = useState(true);

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const freePlaysLeft = Math.max(0, FREE_PLAYS_PER_DAY - playsToday);
  const canStart = freePlaysLeft > 0 || tokens >= 1;

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleStart = async () => {
    if (!canStart || isRunning) return;

    setResult(null);

    if (playsToday < FREE_PLAYS_PER_DAY) {
      // Free play
      const newCount = incrementPlays();
      setPlaysToday(newCount);
      setIsFreePlay(true);
    } else {
      // Paid play — deduct 1 token
      setIsFreePlay(false);
      await base44.auth.updateMe({ earlyAccessTokens: tokens - 1 });
      await onUserUpdate();
    }

    startTimeRef.current = Date.now();
    setElapsedTime(0);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 10);
  };

  const handleStop = async () => {
    if (!isRunning) return;

    clearInterval(intervalRef.current);
    setIsRunning(false);

    const rawMs = Date.now() - startTimeRef.current;
    const stopped = parseFloat((rawMs / 1000).toFixed(2));
    const stoppedStr = stopped.toFixed(2);

    if (stoppedStr === "10.00") {
      // JACKPOT
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 3 });
      await onUserUpdate();
      setResult({ type: "jackpot", message: `JACKPOT! PERFECT 10! +3 Tokens 💎`, time: stoppedStr });
    } else if (stopped >= 9.90 && stopped <= 10.10) {
      // Near miss
      // Near miss always awards 1 token (refund if paid, bonus if free)
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 1 });
      await onUserUpdate();
      if (!isFreePlay) {
        setResult({ type: "close", message: `Close call! You stopped at ${stoppedStr}s. Here is your 1 token back! 😅`, time: stoppedStr });
      } else {
        setResult({ type: "close", message: `Close call! You stopped at ${stoppedStr}s. +1 Free Token! 😅`, time: stoppedStr });
      }
    } else {
      // Miss
      setResult({ type: "miss", message: `Oof, you stopped at ${stoppedStr}s! Try again! 😢`, time: stoppedStr });
    }
  };

  const displayTime = isRunning
    ? (elapsedTime / 1000).toFixed(2)
    : result
    ? result.time
    : "0.00";

  const timerColor = isRunning
    ? elapsedTime > 10100
      ? "text-red-500"
      : elapsedTime >= 9800
      ? "text-emerald-500"
      : "text-foreground"
    : result?.type === "jackpot"
    ? "text-amber-500"
    : result?.type === "close" || result?.type === "close_free"
    ? "text-emerald-500"
    : "text-foreground";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h3 className="font-black text-base text-foreground">⏱️ Perfect 10</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Stop the timer at <strong>EXACTLY 10.00 seconds</strong>.<br />
          <span className="text-amber-600 dark:text-amber-400 font-semibold">Jackpot: 3 Tokens!</span>{" "}</p>
           <p (Stop between 9.90s–10.10s to win 1 token)
        </p>
      </div>

      {/* Free plays badge */}
      <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5 border border-border">
        <span className="text-xs font-semibold text-muted-foreground">Free Tries Today</span>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                i < freePlaysLeft
                  ? "bg-emerald-400 border-emerald-500"
                  : "bg-muted-foreground/20 border-muted-foreground/30"
              }`}
            />
          ))}
          <span className="text-xs font-black text-foreground ml-1">{freePlaysLeft} / {FREE_PLAYS_PER_DAY}</span>
        </div>
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center py-4">
        <span
          className={`font-black tabular-nums transition-colors duration-150 ${timerColor}`}
          style={{ fontSize: "clamp(3rem, 16vw, 5.5rem)", letterSpacing: "-0.02em", lineHeight: 1 }}
        >
          {displayTime}
        </span>
      </div>

      {/* Result message */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.type + result.time}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl px-4 py-3 text-center text-sm font-semibold border ${
              result.type === "jackpot"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                : result.type === "close" || result.type === "close_free"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            }`}
          >
            {result.type === "jackpot" && (
              <div className="text-2xl font-black mb-1">🏆</div>
            )}
            {result.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button */}
      <button
        onClick={isRunning ? handleStop : handleStart}
        disabled={!isRunning && !canStart}
        className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${
          isRunning
            ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/25 hover:from-red-400 hover:to-rose-400"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500"
        }`}
      >
        {isRunning
          ? "STOP!"
          : freePlaysLeft > 0
          ? "START (Free)"
          : `START (Cost: 1 Token)`}
      </button>
    </div>
  );
}