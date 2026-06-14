import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { playP10Start, playP10Stop, playP10Jackpot, playP10Close, playP10Miss } from "@/lib/sounds";

// ─── Live Feed ────────────────────────────────────────────────────────────────
function GameRow({ game, currentUserId, getEmoji, getLabel, isAdmin, onDeleted }) {
  const isMe = game.user_id === currentUserId;
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const colorClass =
    game.result_type === "jackpot"
      ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
      : game.result_type === "close"
      ? "bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
      : "bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/30 text-rose-200";

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.PerfectTenGame.delete(game.id);
    onDeleted(game.id);
  };

  return (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs border backdrop-blur-sm transition-all duration-300 ${colorClass} ${isMe ? "ring-1 ring-cyan-400/50 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : ""}`}
    >
      <span className="text-base drop-shadow-md">{getEmoji(game.result_type)}</span>
      <span className="flex-1 text-slate-200 tracking-wide">{getLabel(game)}</span>
      {isMe && (
        <span className="text-[9px] font-black tracking-widest bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-md shadow-sm">
          YOU
        </span>
      )}
      {isAdmin && !confirmDel && (
        <button onClick={() => setConfirmDel(true)} className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-white/5 flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {isAdmin && confirmDel && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handleDelete} disabled={deleting} className="text-[9px] font-black tracking-wider text-white uppercase bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 px-2 py-1 rounded-md shadow disabled:opacity-50 transition-all">
            {deleting ? "…" : "Del"}
          </button>
          <button onClick={() => setConfirmDel(false)} className="text-xs text-slate-400 hover:text-slate-200 font-bold px-1">✕</button>
        </div>
      )}
    </motion.div>
  );
}

function PerfectTenFeed({ currentUserId, isAdmin }) {
  const [feed, setFeed] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

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

  const handleViewAll = async () => {
    if (showAll) { setShowAll(false); return; }
    setLoadingAll(true);
    const all = await base44.entities.PerfectTenGame.list("-created_date", 200);
    if (isAdmin) {
      setAllGames(all);
    } else {
      const todayStr = new Date().toLocaleDateString("en-CA");
      setAllGames(all.filter((g) => {
        const d = g.created_date ? new Date(g.created_date).toLocaleDateString("en-CA") : null;
        return d === todayStr;
      }));
    }
    setLoadingAll(false);
    setShowAll(true);
  };

  const handleDeleted = (id) => {
    setFeed((prev) => prev.filter((g) => g.id !== id));
    setAllGames((prev) => prev.filter((g) => g.id !== id));
  };

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
      return <><strong>{name}</strong> hit <span className="text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">PERFECT 10!</span> +3 tokens 🎉</>;
    if (game.result_type === "close")
      return <><strong>{name}</strong> stopped at <strong className="text-white">{time}s</strong> — <span className="text-emerald-400 font-bold">+1 token</span></>;
    return <><strong>{name}</strong> stopped at <strong className="text-slate-300">{time}s</strong> — <span className="text-rose-400 font-medium">missed!</span></>;
  };

  const displayList = showAll ? allGames : feed;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl p-4 mt-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/40 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Activity Network</p>
        </div>
        <button
          onClick={handleViewAll}
          disabled={loadingAll}
          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors disabled:opacity-50 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-0.5"
        >
          {loadingAll ? "Syncing…" : showAll ? "Recent" : "View All"}
        </button>
      </div>

      {/* ─── User Stats Info Banner ─── */}
      {(() => {
        const todayStr = new Date().toLocaleDateString("en-CA");
        const sourceList = allGames.length > 0 ? allGames : feed;
        const myTodayGames = sourceList.filter(g => {
          const isMe = g.user_id === currentUserId;
          const isToday = g.created_date ? new Date(g.created_date).toLocaleDateString("en-CA") : null;
          return isMe && isToday === todayStr;
        });
        
        const todayAttempts = myTodayGames.length;

        return (
          <div className="flex justify-between items-center bg-slate-950/50 backdrop-blur-sm rounded-xl px-3 py-2 mb-3 text-[10px] text-slate-400 border border-slate-800/60 shadow-inner">
            <span>📊 Today's Total Tries: <strong className="text-cyan-400 font-black text-xs ml-1">{todayAttempts}</strong></span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[9px] font-medium uppercase tracking-wider text-slate-500">Date: {todayStr}</span>
          </div>
        );
      })()}

      <div className={`space-y-2 ${showAll ? "max-h-80 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800" : ""}`}>
        <AnimatePresence initial={false}>
          {displayList.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              currentUserId={currentUserId}
              getEmoji={getEmoji}
              getLabel={getLabel}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </AnimatePresence>
        {showAll && allGames.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-5 tracking-wide">Matrix timeline empty. Jump in!</p>
        )}
      </div>
    </div>
  );
}

// ─── Tension Progress Bar ─────────────────────────────────────────────────────
function TensionBar({ elapsedMs, isRunning }) {
  const [speedOffset, setSpeedOffset] = useState(0);
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSpeedOffset((prev) => {
        const nudge = (Math.random() - 0.5) * 0.4;
        return Math.max(-1, Math.min(1, prev + nudge));
      });
      setFlicker(Math.random() < 0.25);
    }, 600);
    return () => clearInterval(id);
  }, [isRunning]);

  const visualMs = Math.max(0, elapsedMs + speedOffset * 1000);
  const clampedSec = Math.min(visualMs / 1000, 10);
  const pct = (clampedSec / 10) * 100;
  const isOver = elapsedMs > 10000;
  const barColor = isOver ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600";
  const glowColor = isOver ? "shadow-red-500/50 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "shadow-cyan-500/40 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]";

  return (
    <div className="w-full flex flex-col gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-900 shadow-inner">
      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>0.00s</span>
        <span className="text-cyan-400 animate-pulse font-extrabold">⏱️ Stabilize at 10.00s</span>
        <span>10.00s+</span>
      </div>
      <div className="relative h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-[1px]">
        <motion.div
          className={`h-full rounded-full ${barColor} shadow-lg ${glowColor} transition-colors duration-150`}
          style={{ width: `${pct}%`, opacity: flicker && isRunning ? 0.5 : 1 }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 dark:bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" style={{ left: "calc(100% - 2px)" }} />
      </div>
      <div className="flex justify-between text-[9px] font-bold text-slate-500 px-0.5 tracking-tighter">
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
const SPRINT_DURATION_MS = 300000;
const LS_UNLOCK_KEY = "perfect10_unlocked_until";

function getTodayString() {
  return new Date().toLocaleDateString("en-CA");
}

function getSprintTimeLeft() {
  const until = parseInt(localStorage.getItem(LS_UNLOCK_KEY) || "0", 10);
  return Math.max(0, until - Date.now());
}

function formatSprintTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PerfectTen({ user, onUserUpdate, isAdmin }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState(null);
  const [currentPlayMode, setCurrentPlayMode] = useState(null);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(() => getSprintTimeLeft());

  const playsToday = user?.perfect10_plays_date === getTodayString() ? (user?.perfect10_plays_count ?? 0) : 0;

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const sprintTickRef = useRef(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const freePlaysLeft = Math.max(0, FREE_PLAYS_PER_DAY - playsToday);
  const hasActiveSprint = sprintTimeLeft > 0;
  const canStart = freePlaysLeft > 0 || hasActiveSprint || tokens >= 1;

  useEffect(() => {
    clearInterval(sprintTickRef.current);
    if (sprintTimeLeft > 0) {
      sprintTickRef.current = setInterval(() => {
        const left = getSprintTimeLeft();
        setSprintTimeLeft(left);
        if (left <= 0) clearInterval(sprintTickRef.current);
      }, 250);
    }
    return () => clearInterval(sprintTickRef.current);
  }, [sprintTimeLeft > 0]);

  useEffect(() => {
    return () => {
      clearInterval(sprintTickRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = async () => {
    if (!canStart || isRunning) return;
    playP10Start();
    setResult(null);

    if (freePlaysLeft > 0) {
      const newPlays = playsToday + 1;
      await base44.auth.updateMe({
        perfect10_plays_count: newPlays,
        perfect10_plays_date: getTodayString()
      });
      await onUserUpdate();
      setCurrentPlayMode("free");
    } else if (hasActiveSprint) {
      setCurrentPlayMode("unlimited");
    } else {
      await base44.auth.updateMe({ earlyAccessTokens: tokens - 1 });
      await onUserUpdate();
      const until = Date.now() + SPRINT_DURATION_MS;
      localStorage.setItem(LS_UNLOCK_KEY, String(until));
      setSprintTimeLeft(SPRINT_DURATION_MS);
      setCurrentPlayMode("unlimited");
      base44.entities.SprintPurchase.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      });
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
    let tokensDelta = 0;

  if (stoppedStr === "10.00") {
      resultType = "jackpot";
      tokensDelta = 3;
      playP10Jackpot();
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 3 });
      await onUserUpdate();
      if (currentPlayMode === "unlimited") {
        localStorage.removeItem(LS_UNLOCK_KEY);
        setSprintTimeLeft(0);
      }
      setResult({ type: "jackpot", message: `JACKPOT! PERFECT 10.00s! +3 Tokens 💎`, time: stoppedStr });
    } else if (currentPlayMode === "free" && stopped >= NEAR_MIN && stopped <= NEAR_MAX) {
      resultType = "close";
      tokensDelta = 1;
      playP10Close();
      await base44.auth.updateMe({ earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 1 });
      await onUserUpdate();
      setResult({ type: "close", message: `Close! Near Miss Bonus: +1 Token 🎁 (${stoppedStr}s)`, time: stoppedStr });
    } else {
      resultType = "miss";
      tokensDelta = 0;
      playP10Miss();
      setResult({ type: "miss", message: `Oof, ${stoppedStr}s! Try again! 😢`, time: stoppedStr });
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

  const isOver = isRunning && elapsedTime > 10100;
  const timerColor = isRunning
    ? isOver
      ? "text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]"
      : "text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
    : result?.type === "jackpot"
    ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse"
    : result?.type === "close"
    ? "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]"
    : "text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-400";

  const startBtnLabel = freePlaysLeft > 0
    ? `▶ START (Free Try: ${freePlaysLeft}/${FREE_PLAYS_PER_DAY})`
    : hasActiveSprint
    ? `⚡ START SPRINT`
    : `🔓 UNLOCK 5 MINUTES (Cost: 1 Token)`;

  const sprintTotalSec = Math.ceil(sprintTimeLeft / 1000);
  const sprintMin = Math.floor(sprintTotalSec / 60);
  const sprintSec = sprintTotalSec % 60;

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto p-1">
      <div className="bg-slate-950/70 dark:bg-card/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl p-6 flex flex-col gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-44 h-44 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="border-b border-slate-900 pb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 shadow-inner">
              <span className="text-sm">⏱️</span>
            </div>
            <h3 className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight uppercase">Perfect 10</h3>
          </div>
          
          {/* Instruction card */}
          <div className="mt-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-3.5 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">Operations Protocol</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                <span className="text-emerald-400 font-bold mt-0.5">🆓</span>
                <span><strong className="text-slate-200">Free Tries:</strong> Stop dead on <strong className="text-amber-400 font-bold">10.00s</strong> → <strong className="text-amber-400 font-bold">+3 Tokens</strong>, or within the threshold (<strong className="text-emerald-400 font-bold">9.95–10.05s</strong>) → <strong className="text-emerald-400 font-bold">+1 Token</strong>!</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                <span className="text-purple-400 font-bold mt-0.5">⚡</span>
                <span><strong className="text-slate-200">Sprint Matrix:</strong> Commit <strong className="text-purple-400 font-bold">1 Token</strong> for <strong className="text-purple-400 font-bold">5 Mins UNLIMITED plays</strong> (Jackpot evaluation only. Structural bypass terminates immediately on 10.00 success).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sprint countdown banner */}
        {hasActiveSprint && (
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-indigo-950/40 rounded-2xl px-5 py-4 border border-purple-500/30 shadow-lg shadow-purple-950/40 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg shadow-inner">⚡</div>
              <div>
                <p className="text-xs font-black text-purple-300 uppercase tracking-widest">Unlimited Sprint Mode</p>
                <p className="text-[10px] text-purple-400/80 font-medium tracking-wide">Jackpot evaluation parameters active</p>
              </div>
            </div>
            <div className="text-right bg-purple-950/30 border border-purple-500/10 px-3 py-1.5 rounded-xl shadow-inner">
              <div className="flex items-end gap-0.5 justify-end">
                <span className="font-black tabular-nums text-purple-300 tracking-tighter" style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                  {sprintMin}:{String(sprintSec).padStart(2, "0")}
                </span>
              </div>
              <p className="text-[9px] text-purple-400/60 uppercase tracking-wider font-bold mt-0.5">remaining</p>
            </div>
          </div>
        )}

        {/* Free plays badge */}
        <div className="flex items-center justify-between bg-slate-900/30 rounded-2xl px-4 py-3 border border-slate-800/60 shadow-inner">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free Allocations Left</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-900">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    i < freePlaysLeft
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : "bg-slate-800 border-slate-700 opacity-40"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-black text-slate-200 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 tabular-nums">{freePlaysLeft} / {FREE_PLAYS_PER_DAY}</span>
          </div>
        </div>

        {/* Timer display */}
        <motion.div
          className="flex items-center justify-center py-4 select-none relative"
          animate={{ scale: isRunning ? [1, 1.01, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span
            className={`font-black tabular-nums tracking-tighter transition-colors duration-150 ${timerColor}`}
            style={{ fontSize: "clamp(3.5rem, 18vw, 6rem)", letterSpacing: "-0.04em", lineHeight: 1 }}
          >
            {displayTime}
          </span>
        </motion.div>

        {/* Tension progress bar — hide in last 2s */}
        {isRunning && elapsedTime < 8000 && (
          <TensionBar elapsedMs={elapsedTime} isRunning={isRunning} />
        )}

        {/* Result message */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.type + result.time}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`rounded-2xl px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${
                result.type === "jackpot"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                  : result.type === "close"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.05)]"
              }`}
            >
              {result.type === "jackpot" && <div className="text-3xl animate-bounce mb-1">🏆</div>}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={!isRunning && !canStart}
          className={`w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl border border-black/20 ${
            isRunning
              ? "bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-rose-950/40 hover:brightness-110"
              : hasActiveSprint || freePlaysLeft > 0
              ? "bg-gradient-to-b from-cyan-500 via-blue-600 to-blue-700 text-white shadow-blue-950/50 hover:brightness-110"
              : "bg-gradient-to-b from-purple-500 via-indigo-600 to-indigo-700 text-white shadow-indigo-950/50 hover:brightness-110"
          }`}
          style={{ paddingHeight: "1.125rem" }}
        >
          {isRunning ? "⏹ HALT CORE!" : startBtnLabel}
        </button>
      </div>
      
      <PerfectTenFeed currentUserId={user?.id} isAdmin={isAdmin} />
    </div>
  );
}