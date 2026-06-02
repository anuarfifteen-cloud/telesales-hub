import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { playP10Start, playP10Stop, playP10Jackpot, playP10Close, playP10Miss } from "@/lib/sounds";

// ─── Live Feed ────────────────────────────────────────────────────────────────
function PerfectTenFeed({ currentUserId }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    base44.entities.PerfectTenGame.list("-created_date", 3).then((games) => {
      setFeed(games.slice(0, 3));
    });
    const unsub = base44.entities.PerfectTenGame.subscribe((event) => {
      if (event.type === "create") {
        setFeed((prev) => [event.data, ...prev].slice(0, 3));
      }
    });
    return unsub;
  }, []);

  if (feed.length === 0) return null;

  const getName = (game) => {
    if (game.user_id === currentUserId) return "You";
    if (game.user_email) return game.user_email.split("@")[0];
    return "Someone";
  };

  const getEmoji = (type) => ({ jackpot: "🏆", close: "😅", miss: "💨" }[type] || "⏱️");

  const getLabel = (game) => {
    const name = getName(game);
    const time = game.stopped_time?.toFixed(2) ?? "?";
    if (game.result_type === "jackpot")
      return <><strong>{name}</strong> hit <span className="text-amber-600 dark:text-amber-400 font-semibold">PERFECT 10!</span> +3 tokens 🎉</>;
    if (game.result_type === "close")
      return <><strong>{name}</strong> stopped at <strong>{time}s</strong> — <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+1 token</span></>;
    return <><strong>{name}</strong> stopped at <strong>{time}s</strong> — <span className="text-red-500 dark:text-red-400">missed!</span></>;
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-3 mt-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">🔴 Live Activity</p>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {feed.map((game) => {
            const isMe = game.user_id === currentUserId;
            const colorClass =
              game.result_type === "jackpot"
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                : game.result_type === "close"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${colorClass} ${isMe ? "ring-1 ring-blue-300 dark:ring-blue-700" : ""}`}
              >
                <span className="text-base">{getEmoji(game.result_type)}</span>
                <span className="flex-1 text-foreground">{getLabel(game)}</span>
                {isMe && <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">YOU</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Tension Progress Bar ─────────────────────────────────────────────────────
function TensionBar({ elapsedMs, isRunning }) {
  // Fill from 0→100% over 0–10s, then stays full (over = red)
  const clampedSec = Math.min(elapsedMs / 1000, 10);
  const pct = (clampedSec / 10) * 100;
  const isOver = elapsedMs > 10000;
  // Near zone: 9.95–10.05s
  const isNear = elapsedMs >= 9500 && elapsedMs <= 10500;

  const barColor = isOver
    ? "bg-red-500"
    : isNear
    ? "bg-emerald-500"
    : "bg-blue-500";

  const glowColor = isOver
    ? "shadow-red-500/60"
    : isNear
    ? "shadow-emerald-500/60"
    : "shadow-blue-500/40";

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Labels */}
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        <span>0s</span>
        <span className={isNear && isRunning ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : ""}>
          🎯 STOP ZONE
        </span>
        <span>10s+</span>
      </div>

      {/* Track */}
      <div className="relative h-4 bg-muted rounded-full overflow-hidden border border-border">
        {/* Sweet-spot zone highlight (9.95s–10.05s = 99.5%–100.5% → clamp to 99.5%–100%) */}
        <div
          className="absolute top-0 h-full bg-emerald-300/50 dark:bg-emerald-500/30 rounded-full"
          style={{ left: "99.5%", width: "0.5%" }}
        />

        {/* Filled bar */}
        <motion.div
          className={`h-full rounded-full ${barColor} shadow-lg ${glowColor} transition-colors duration-150`}
          style={{ width: `${pct}%` }}
          animate={isNear && isRunning ? { opacity: [1, 0.75, 1] } : { opacity: 1 }}
          transition={{ repeat: Infinity, duration: 0.4 }}
        />

        {/* 10s marker line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 dark:bg-amber-500 opacity-80" style={{ left: "calc(100% - 2px)" }} />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
        {[0, 2, 4, 6, 8, 10].map((s) => (
          <span key={s}>{s}s</span>
        ))}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FREE_PLAYS_PER_DAY = 3;
const NEAR_MIN = 9.95;
const NEAR_MAX = 10.05;

function getTodayString() {
  return new Date().toLocaleDateString("en-CA");
}

function getServerPlaysToday(user) {
  const today = getTodayString();
  if (user?.perfect10PlaysDate !== today) return 0;
  return user?.perfect10PlaysCount ?? 0;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PerfectTen({ user, onUserUpdate }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState(null);
  const [isFreePlay, setIsFreePlay] = useState(true);

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const playsToday = getServerPlaysToday(user);
  const freePlaysLeft = Math.max(0, FREE_PLAYS_PER_DAY - playsToday);
  const canStart = freePlaysLeft > 0 || tokens >= 1;

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleStart = async () => {
    if (!canStart || isRunning) return;
    playP10Start();
    setResult(null);

    if (playsToday < FREE_PLAYS_PER_DAY) {
      setIsFreePlay(true);
      await base44.auth.updateMe({
        perfect10PlaysDate: getTodayString(),
        perfect10PlaysCount: playsToday + 1,
      });
      await onUserUpdate();
    } else {
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
    playP10Stop();
    clearInterval(intervalRef.current);
    setIsRunning(false);

    const rawMs = Date.now() - startTimeRef.current;
    const stopped = parseFloat((rawMs / 1000).toFixed(2));
    const stoppedStr = stopped.toFixed(2);

    let resultType = "miss";
    let tokensDelta = isFreePlay ? 0 : 0;

    if (stoppedStr === "10.00") {
      resultType = "jackpot";
      tokensDelta = 3;
      playP10Jackpot();
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 3 });
      await onUserUpdate();
      setResult({ type: "jackpot", message: `JACKPOT! PERFECT 10.00s! +3 Tokens 💎`, time: stoppedStr });
    } else if (stopped >= NEAR_MIN && stopped <= NEAR_MAX) {
      resultType = "close";
      tokensDelta = 1;
      playP10Close();
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 1 });
      await onUserUpdate();
      setResult({
        type: "close",
        message: isFreePlay
          ? `So close! You stopped at ${stoppedStr}s. +1 Free Token! 😅`
          : `Close call! You stopped at ${stoppedStr}s. Token returned +1! 😅`,
        time: stoppedStr,
      });
    } else {
      resultType = "miss";
      tokensDelta = isFreePlay ? 0 : -1;
      playP10Miss();
      setResult({ type: "miss", message: `Oof! You stopped at ${stoppedStr}s. Try again! 😢`, time: stoppedStr });
    }

    await base44.entities.PerfectTenGame.create({
      user_id: user.id,
      user_email: user.email,
      stopped_time: stopped,
      result_type: resultType,
      tokens_delta: tokensDelta,
    });
  };

  const displayTime = isRunning
    ? (elapsedTime / 1000).toFixed(2)
    : result
    ? result.time
    : "0.00";

  const isNearZone = isRunning && elapsedTime >= 9500 && elapsedTime <= 10500;
  const isOver = isRunning && elapsedTime > 10100;

  const timerColor = isRunning
    ? isOver
      ? "text-red-500"
      : isNearZone
      ? "text-emerald-500"
      : "text-foreground"
    : result?.type === "jackpot"
    ? "text-amber-500"
    : result?.type === "close"
    ? "text-emerald-500"
    : "text-foreground";

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">

        {/* Header */}
        <div>
          <h3 className="font-black text-base text-foreground">⏱️ Perfect 10</h3>

          {/* Instruction card */}
          <div className="mt-2 rounded-xl border border-border bg-muted/60 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-xs font-bold text-foreground">How to play</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-1.5">
                <span className="text-amber-500 font-black mt-0.5">★</span>
                <span>Hit <strong className="text-amber-600 dark:text-amber-400">EXACTLY 10.00s</strong> → <strong className="text-amber-600 dark:text-amber-400">+3 Tokens</strong></span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-black mt-0.5">●</span>
                <span>Stop between <strong className="text-emerald-600 dark:text-emerald-400">9.95s – 10.05s</strong> → <strong className="text-emerald-600 dark:text-emerald-400">Near Miss +1 Token</strong></span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-red-400 font-black mt-0.5">✕</span>
              </div>
            </div>
          </div>
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
        <motion.div
          className="flex items-center justify-center py-2"
          animate={isNearZone ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 0.35 }}
        >
          <span
            className={`font-black tabular-nums transition-colors duration-150 ${timerColor}`}
            style={{ fontSize: "clamp(3rem, 16vw, 5.5rem)", letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            {displayTime}
          </span>
        </motion.div>

        {/* Tension progress bar — only show when running */}
        {isRunning && (
          <TensionBar elapsedMs={elapsedTime} isRunning={isRunning} />
        )}

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
                  : result.type === "close"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
              }`}
            >
              {result.type === "jackpot" && <div className="text-2xl font-black mb-1">🏆</div>}
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
            ? "⏹ STOP!"
            : freePlaysLeft > 0
            ? "▶ START (Free)"
            : `▶ START (Cost: 1 Token)`}
        </button>
      </div>

      <PerfectTenFeed currentUserId={user?.id} />
    </div>
  );
}