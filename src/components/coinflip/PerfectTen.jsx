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
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
      : game.result_type === "close"
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
      : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";

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
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${colorClass} ${isMe ? "ring-1 ring-blue-300 dark:ring-blue-700" : ""}`}
    >
      <span className="text-base">{getEmoji(game.result_type)}</span>
      <span className="flex-1 text-foreground">{getLabel(game)}</span>
      {isMe && (
        <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
          YOU
        </span>
      )}
      {isAdmin && !confirmDel && (
        <button
          onClick={() => setConfirmDel(true)}
          className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {isAdmin && confirmDel && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded disabled:opacity-50"
          >
            {deleting ? "…" : "Del"}
          </button>
          <button
            onClick={() => setConfirmDel(false)}
            className="text-[9px] text-slate-500 hover:text-slate-700 font-semibold"
          >
            ✕
          </button>
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

  // Ref to avoid stale closure in subscription callback
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    base44.entities.PerfectTenGame.list("-created_date", 10).then((games) => {
      setFeed(games.slice(0, 10));
    });
    const unsub = base44.entities.PerfectTenGame.subscribe((event) => {
      if (event.type === "create") {
        setFeed((prev) => [event.data, ...prev].slice(0, 10));
      }
    });
    return unsub;
  }, []);

  const handleViewAll = async () => {
    if (showAll) {
      setShowAll(false);
      return;
    }
    setLoadingAll(true);
    const all = await base44.entities.PerfectTenGame.list("-created_date", 200);
    if (isAdmin) {
      setAllGames(all);
    } else {
      const todayStr = new Date().toLocaleDateString("en-CA");
      setAllGames(
        all.filter((g) => {
          const d = g.created_date
            ? new Date(g.created_date).toLocaleDateString("en-CA")
            : null;
          return d === todayStr;
        })
      );
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
    if (game.user_id === currentUserIdRef.current) return "You";
    if (game.user_email) return game.user_email.split("@")[0];
    return "Someone";
  };

  const getEmoji = (type) =>
    ({ jackpot: "🏆", close: "😅", miss: "💨" }[type] || "⏱️");

  const stableList = allGames.length > 0 ? allGames : feed;
  const displayList = showAll ? allGames : feed;

  const getLabel = (game, rawList) => {
    const name = getName(game);
    const time = game.stopped_time?.toFixed(2) ?? "?";

    const playDate = game.created_date
      ? new Date(game.created_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
      : "Today";

    const gameDayStr = game.created_date
      ? new Date(game.created_date).toLocaleDateString("en-CA")
      : "Today";

    const userGamesOnThisDay = rawList
      .filter(
        (g) =>
          g.user_id === game.user_id &&
          (g.created_date
            ? new Date(g.created_date).toLocaleDateString("en-CA")
            : "Today") === gameDayStr
      )
      .reverse();

    const gameIndex = userGamesOnThisDay.findIndex((g) => g.id === game.id);
    const realTryNum = gameIndex !== -1 ? gameIndex + 1 : (game.play_number ?? 1);
    const isExceeded = realTryNum > 3 && game.result_type !== "miss";
    const tryDisplay = `(Try #${realTryNum})`;

    if (game.result_type === "jackpot")
      return (
        <>
          <strong>{name}</strong> hit{" "}
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            PERFECT 10!
          </span>{" "}
          <span className={isExceeded ? "text-red-500 font-black animate-pulse" : "text-muted-foreground"}>
            {tryDisplay}
          </span>{" "}
          on {playDate} +3 tokens 🎉
        </>
      );

    if (game.result_type === "close")
      return (
        <>
          <strong>{name}</strong> stopped at <strong>{time}s</strong>{" "}
          <span className={isExceeded ? "text-red-500 font-black animate-pulse" : "text-muted-foreground"}>
            {tryDisplay}
          </span>{" "}
          —{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            +1 token
          </span>{" "}
          on {playDate}
        </>
      );

    return (
      <>
        <strong>{name}</strong> stopped at <strong>{time}s</strong>{" "}
        <span className="text-muted-foreground/70">{tryDisplay}</span> —{" "}
        <span className="text-red-500 dark:text-red-400">missed!</span> on{" "}
        {playDate}
      </>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-3 mt-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          🔴 Live Activity
        </p>
        <button
          onClick={handleViewAll}
          disabled={loadingAll}
          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {loadingAll ? "Loading…" : showAll ? "Show Recent" : "View All"}
        </button>
      </div>

      <div className={`space-y-1.5 ${showAll ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
        <AnimatePresence initial={false}>
          {displayList.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              currentUserId={currentUserId}
              getEmoji={getEmoji}
              getLabel={(g) => getLabel(g, stableList)}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </AnimatePresence>
        {showAll && allGames.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No history yet.
          </p>
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

  const barColor = isOver ? "bg-red-500" : "bg-blue-500";
  const glowColor = isOver ? "shadow-red-500/60" : "shadow-blue-500/40";

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        <span>0s</span>
        <span>⏱️ Stop at 10s</span>
        <span>10s+</span>
      </div>

      <div className="relative h-4 bg-muted rounded-full overflow-hidden border border-border">
        <motion.div
          className={`h-full rounded-full ${barColor} shadow-lg ${glowColor} transition-colors duration-150`}
          style={{ width: `${pct}%`, opacity: flicker && isRunning ? 0.6 : 1 }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 dark:bg-amber-500 opacity-80"
          style={{ left: "calc(100% - 2px)" }}
        />
      </div>

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
const JACKPOT_TARGET = 10.0;
const JACKPOT_TOLERANCE = 0.005;
const SPRINT_DURATION_MS = 300000;
const SPRINT_DISPLAY_MINUTES = SPRINT_DURATION_MS / 60000;

function getSprintKey(userId) {
  return `perfect10_unlocked_until_${userId}`;
}

function getTodayString() {
  return new Date().toLocaleDateString("en-CA");
}

function getSprintTimeLeft(userId) {
  if (!userId) return 0;
  const until = parseInt(localStorage.getItem(getSprintKey(userId)) || "0", 10);
  return Math.max(0, until - Date.now());
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PerfectTen({ user, onUserUpdate, isAdmin }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState(null);
  const [currentPlayMode, setCurrentPlayMode] = useState(null);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(() =>
    getSprintTimeLeft(user?.id)
  );
  const [playsToday, setPlaysToday] = useState(0);

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const sprintTickRef = useRef(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const freePlaysLeft = Math.max(0, FREE_PLAYS_PER_DAY - playsToday);
  const hasActiveSprint = sprintTimeLeft > 0;
  const canStart = freePlaysLeft > 0 || hasActiveSprint || tokens >= 1;

  // Ref to safely read playsToday inside async callbacks without stale closure
  const playsTodayRef = useRef(playsToday);
  useEffect(() => {
    playsTodayRef.current = playsToday;
  }, [playsToday]);

  useEffect(() => {
    if (!user?.id) return;

    async function syncPlaysFromDatabase() {
      try {
        const matches = await base44.entities.PerfectTenGame.filter({
          user_id: user.id,
        });
        const todayStr = getTodayString();
        const realCount = matches.filter((g) => {
          const d = g.created_date
            ? new Date(g.created_date).toLocaleDateString("en-CA")
            : null;
            
          return d === todayStr && g.play_number !== null && g.play_number !== undefined;
          
        }).length;
        setPlaysToday(realCount);
      } catch (err) {
        console.error("Failed to sync plays from database.", err);
        // Leave current state as-is on error — don't lock user out
      }
    }

    syncPlaysFromDatabase();
  }, [user?.id, isRunning]);

  // FIX #1: Use actual sprintTimeLeft value as dep (not boolean), and always
  // clearInterval before registering a new one to prevent interval stacking.
  useEffect(() => {
    clearInterval(sprintTickRef.current);
    if (sprintTimeLeft <= 0) return;

    sprintTickRef.current = setInterval(() => {
      const left = getSprintTimeLeft(user?.id);
      setSprintTimeLeft(left);
      if (left <= 0) clearInterval(sprintTickRef.current);
    }, 250);

    return () => clearInterval(sprintTickRef.current);
  }, [sprintTimeLeft, user?.id]);

  useEffect(() => {
    return () => {
      clearInterval(sprintTickRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = async () => {
    if (!canStart || isRunning) return;
    playP10Start();
    setResult(null); // FIX #2: was Result(null) — typo causing ReferenceError crash

    if (freePlaysLeft > 0) {
      setCurrentPlayMode("free");
    } else if (hasActiveSprint) {
      setCurrentPlayMode("unlimited");
    } else {
      await base44.auth.updateMe({ earlyAccessTokens: tokens - 1 });
      await onUserUpdate();
      const until = Date.now() + SPRINT_DURATION_MS;
      localStorage.setItem(getSprintKey(user.id), String(until));
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

    let resultType = "miss";
    let tokensDelta = 0;

    const isJackpot = Math.abs(stopped - JACKPOT_TARGET) < JACKPOT_TOLERANCE;
    const isNearMiss =
      currentPlayMode === "free" && stopped >= NEAR_MIN && stopped <= NEAR_MAX;

    if (isJackpot) {
      resultType = "jackpot";
      tokensDelta = 3;
      playP10Jackpot();
      await base44.auth.updateMe({
        earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 3,
      });
      await onUserUpdate();
      if (currentPlayMode === "unlimited") {
        localStorage.removeItem(getSprintKey(user.id));
        setSprintTimeLeft(0);
      }
      setResult({
        type: "jackpot",
        message: `JACKPOT! PERFECT 10.00s! +3 Tokens 💎`,
        time: stopped.toFixed(2),
      });
    } else if (isNearMiss) {
      resultType = "close";
      tokensDelta = 1;
      playP10Close();
      await base44.auth.updateMe({
        earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + 1,
      });
      await onUserUpdate();
      setResult({
        type: "close",
        message: `Close! Near Miss Bonus: +1 Token 🎁 (${stopped.toFixed(2)}s)`,
        time: stopped.toFixed(2),
      });
    } else {
      resultType = "miss";
      tokensDelta = 0;
      playP10Miss();
      setResult({
        type: "miss",
        message: `Oof, ${stopped.toFixed(2)}s! Try again! 😢`,
        time: stopped.toFixed(2),
      });
    }

    // Re-fetch true count from DB to avoid race condition on play_number
    let trueTryNumber = null;
    if (currentPlayMode === "free") {
      try {
        const matches = await base44.entities.PerfectTenGame.filter({
          user_id: user.id,
        });
        const todayStr = getTodayString();
        const todayCount = matches.filter((g) => {
          const d = g.created_date
            ? new Date(g.created_date).toLocaleDateString("en-CA")
            : null;
          return d === todayStr;
        }).length;
        trueTryNumber = todayCount + 1;
      } catch {
        trueTryNumber = playsTodayRef.current + 1; // safe ref-based fallback
      }
    }

    await base44.entities.PerfectTenGame.create({
      user_id: user.id,
      user_email: user.email,
      stopped_time: stopped,
      result_type: resultType,
      tokens_delta: tokensDelta,
      play_number: trueTryNumber,
    });

    setPlaysToday((prev) => prev + 1);
  };

  const displayTime = isRunning
    ? (elapsedTime / 1000).toFixed(2)
    : result
    ? result.time
    : "0.00";

  const isOver = isRunning && elapsedTime > 10100;

  const timerColor = isRunning
    ? isOver
      ? "text-red-500"
      : "text-foreground"
    : result?.type === "jackpot"
    ? "text-amber-500"
    : result?.type === "close"
    ? "text-emerald-500"
    : "text-foreground";

  const startBtnLabel =
    freePlaysLeft > 0
      ? `▶ START (Free Try: ${freePlaysLeft}/3)`
      : hasActiveSprint
      ? `▶ START SPRINT`
      : `🔓 UNLOCK ${SPRINT_DISPLAY_MINUTES} MINUTES (Cost: 1 Token)`;

  const sprintTotalSec = Math.ceil(sprintTimeLeft / 1000);
  const sprintMin = Math.floor(sprintTotalSec / 60);
  const sprintSec = sprintTotalSec % 60;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h3 className="font-black text-base text-foreground">⏱️ Perfect 10</h3>
          <div className="mt-2 rounded-xl border border-border bg-muted/60 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-xs font-bold text-foreground">How to play</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-black mt-0.5">🆓</span>
                <span>
                  <strong className="text-foreground">Free Tries:</strong> Hit exactly{" "}
                  <strong className="text-amber-600 dark:text-amber-400">10.00s</strong> →{" "}
                  <strong className="text-amber-600 dark:text-amber-400">+3 Tokens</strong>, or get close (
                  <strong className="text-emerald-600 dark:text-emerald-400">9.95–10.05s</strong>) →{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">+1 Token</strong>!
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-purple-500 font-black mt-0.5">⚡</span>
                <span>
                  <strong className="text-foreground">Out of free tries?</strong> Spend{" "}
                  <strong className="text-purple-600 dark:text-purple-400">1 Token</strong> for{" "}
                  <strong className="text-purple-600 dark:text-purple-400">
                    UNLIMITED attempts for {SPRINT_DISPLAY_MINUTES} Minutes
                  </strong>{" "}
                  (Jackpot only, no near miss — ends instantly if you hit 10.00!)
                </span>
              </div>
            </div>
          </div>
        </div>

        {hasActiveSprint && (
          <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-950/50 rounded-2xl px-5 py-4 border-2 border-purple-300 dark:border-purple-700 shadow-md shadow-purple-200/40 dark:shadow-purple-900/30">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                  Unlimited Sprint!
                </p>
                <p className="text-[10px] text-purple-500 dark:text-purple-400">
                  Play unlimited — jackpot only
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-end gap-0.5 justify-end">
                <span
                  className="font-black tabular-nums text-purple-700 dark:text-purple-200"
                  style={{ fontSize: "2rem", lineHeight: 1 }}
                >
                  {sprintMin}:{String(sprintSec).padStart(2, "0")}
                </span>
              </div>
              <p className="text-[10px] text-purple-500 dark:text-purple-400 font-semibold">
                remaining
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5 border border-border">
          <span className="text-xs font-semibold text-muted-foreground">
            Free Tries Today
          </span>
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
            <span className="text-xs font-black text-foreground ml-1">
              {freePlaysLeft} / {FREE_PLAYS_PER_DAY}
            </span>
          </div>
        </div>

        <motion.div className="flex items-center justify-center py-2" animate={{ scale: 1 }}>
          <span
            className={`font-black tabular-nums transition-colors duration-150 ${timerColor}`}
            style={{
              fontSize: "clamp(3rem, 16vw, 5.5rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {displayTime}
          </span>
        </motion.div>

        {isRunning && elapsedTime < 8000 && (
          <TensionBar elapsedMs={elapsedTime} isRunning={isRunning} />
        )}

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
              {result.type === "jackpot" && (
                <div className="text-2xl font-black mb-1">🏆</div>
              )}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={!isRunning && !canStart}
          className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${
            isRunning
              ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/25 hover:from-red-400 hover:to-rose-400"
              : hasActiveSprint || freePlaysLeft > 0
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500"
          }`}
        >
          {isRunning ? "⏹ STOP!" : startBtnLabel}
        </button>
      </div>

      <PerfectTenFeed currentUserId={user?.id} isAdmin={isAdmin} />
    </div>
  );
}