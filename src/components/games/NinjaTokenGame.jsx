import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

const TARGET_SIZE = 56;
const MAX_LIVES = 3;
const POINTS_PER_GOLD = 10;
const BOMB_RATE = 0.30;

// ── Top 3 Leaderboard ──────────────────────────────────────────────────────────
function Top3({ leaders, currentUserId }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="bg-muted border-b border-border px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-amber-500 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Ninja Token — Top 3</p>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Keep slicing to secure your spot! Top players receive token payouts at the deadline.
        </p>
      </div>
      {!leaders || leaders.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs tracking-widest font-bold uppercase">No scores yet — be the first!</div>
      ) : (
        <div className="divide-y divide-border">
          {leaders.map((s, i) => {
            const isYou = s.user_id === currentUserId;
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${isYou ? "ring-1 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/10" : ""}`}>
                <div className="w-7 flex items-center justify-center flex-shrink-0">
                  {i < 3 ? <span className="text-xl">{medals[i]}</span> : <span className="text-[11px] font-black text-muted-foreground">#{i + 1}</span>}
                </div>
                <p className="flex-1 min-w-0 text-sm font-bold text-foreground truncate" style={{ wordBreak: "break-word" }}>
                  {s.user_name}
                  {isYou && <span className="text-[10px] text-indigo-500 ml-1">(You)</span>}
                </p>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/30">{s.score ?? 0}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────────
export default function NinjaTokenGame({ user, onUserUpdate }) {
  const [phase, setPhase] = useState("IDLE"); // IDLE | PLAYING | GAME_OVER
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [targets, setTargets] = useState([]);
  const [boom, setBoom] = useState(null); // { x, key }
  const [leaders, setLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);

  const arenaRef = useRef(null);
  const [arenaH, setArenaH] = useState(460);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const dyingRef = useRef(false);

  // Measure arena height so the float animation can run in px
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const update = () => setArenaH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loadLeaders = useCallback(async () => {
    try {
      const rows = await base44.entities.NinjaTokenScore.list("-score", 3);
      setLeaders(rows || []);
    } catch (e) {
      setLeaders([]);
    } finally {
      setLoadingLeaders(false);
    }
  }, []);

  const loadPersonalBest = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
      setPersonalBest(rows[0] || null);
    } catch (e) {
      setPersonalBest(null);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLeaders();
    loadPersonalBest();
    const unsub = base44.entities.NinjaTokenScore.subscribe(() => {
      loadLeaders();
      loadPersonalBest();
    });
    return unsub;
  }, [loadLeaders, loadPersonalBest]);

  const saveScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        const name = user.full_name || user.email?.split("@")[0] || "Player";
        const existing = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
        const entry = existing[0];
        if (entry) {
          if (finalScore > (entry.score ?? 0)) {
            await base44.entities.NinjaTokenScore.update(entry.id, {
              score: finalScore,
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          await base44.entities.NinjaTokenScore.create({
            user_id: user.id,
            user_name: name,
            score: finalScore,
            updated_at: new Date().toISOString(),
          });
        }
        await loadLeaders();
        await loadPersonalBest();
      } catch (e) {
        console.error("[NinjaToken] save failed:", e?.message || e);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, user?.full_name, user?.email, loadLeaders, loadPersonalBest]
  );

  const removeTarget = useCallback((id) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const endGame = useCallback(
    (finalScore) => {
      if (phase === "GAME_OVER" || dyingRef.current) return;
      dyingRef.current = true;
      setPhase("GAME_OVER");
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      saveScore(finalScore);
    },
    [phase, saveScore]
  );

  const handleFloatEnd = useCallback(
    (t) => {
      // Fires for BOTH the float and the slice animations.
      if (t.sliced) {
        removeTarget(t.id); // finished the ninja slash burst
        return;
      }
      if (t.type === "gold") {
        // Escaped without being sliced — lose a life
        const nl = livesRef.current - 1;
        livesRef.current = nl;
        setLives(nl);
        removeTarget(t.id);
        if (navigator.vibrate) navigator.vibrate(30);
        if (nl <= 0) endGame(scoreRef.current);
      } else {
        // Bomb safely dodged
        removeTarget(t.id);
      }
    },
    [removeTarget, endGame]
  );

  const handleTap = useCallback(
    (t) => {
      if (phase !== "PLAYING" || dyingRef.current || t.sliced) return;
      if (t.type === "bomb") {
        setBoom({ x: t.x, key: Date.now() });
        endGame(scoreRef.current);
        return;
      }
      // Slice a gold token
      setTargets((prev) => prev.map((p) => (p.id === t.id ? { ...p, sliced: true } : p)));
      const ns = scoreRef.current + POINTS_PER_GOLD;
      scoreRef.current = ns;
      setScore(ns);
      if (navigator.vibrate) navigator.vibrate(10);
    },
    [phase, endGame]
  );

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    dyingRef.current = false;
    setScore(0);
    setLives(MAX_LIVES);
    setTargets([]);
    setBoom(null);
    setPhase("PLAYING");
  }, []);

  // Spawn engine — recursive timeout so spawn rate can tighten as the score grows
  useEffect(() => {
    if (phase !== "PLAYING") return;
    let active = true;
    let timer;

    const spawn = () => {
      if (!active || dyingRef.current) return;
      const isBomb = Math.random() < BOMB_RATE;
      const x = Math.random() * 78 + 4; // 4% .. 82%
      const duration = Math.random() * 1.5 + 1.5; // 1.5s .. 3.0s
      setTargets((prev) => [...prev, { id: ++idRef.current, type: isBomb ? "bomb" : "gold", x, duration, sliced: false }]);
      // Faster spawns as the score climbs (min 480ms gap)
      const gap = Math.max(480, 820 - Math.floor(scoreRef.current / 50) * 60);
      timer = setTimeout(spawn, gap);
    };

    timer = setTimeout(spawn, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [phase]);

  const isNewBest = personalBest == null ? false : score > (personalBest.score ?? 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Top 3 Leaderboard */}
      <Top3 leaders={leaders} currentUserId={user?.id} />

      {/* HUD */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lives</span>
          <div className="flex gap-0.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`text-lg ${i < lives ? "opacity-100" : "opacity-25 grayscale"}`}>❤️</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-border rounded-xl px-3 py-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</span>
          <span className="text-xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-pink-500">{score}</span>
        </div>
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        className="relative isolate overflow-hidden rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-300/50 dark:bg-slate-800/50 dark:border-slate-700/80 dark:shadow-purple-900/20"
        style={{ height: 460 }}
      >
        {/* Targets */}
        <AnimatePresence>
          {targets.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: arenaH + 8, opacity: 1 }}
              animate={
                t.sliced
                  ? { scale: [1, 1.5, 0], rotate: [0, 45], opacity: 0 }
                  : { y: -64, opacity: 1 }
              }
              transition={
                t.sliced
                  ? { duration: 0.2, ease: "easeOut" }
                  : { duration: t.duration, ease: "linear" }
              }
              onAnimationComplete={() => handleFloatEnd(t)}
              style={{ position: "absolute", left: `${t.x}%`, top: 0, width: TARGET_SIZE, height: TARGET_SIZE }}
              className="z-20"
            >
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleTap(t);
                }}
                disabled={t.sliced || phase !== "PLAYING"}
                style={{ touchAction: "none" }}
                className={`w-full h-full rounded-full flex items-center justify-center text-2xl select-none border-2 shadow-lg touch-none ${
                  t.type === "bomb"
                    ? "bg-red-500/25 border-red-400/80"
                    : "bg-amber-400/25 border-amber-300/80"
                }`}
              >
                {t.type === "bomb" ? "💣" : "🟡"}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Explosion burst when a bomb is tapped */}
        <AnimatePresence>
          {boom && (
            <motion.div
              key={boom.key}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2.5], opacity: [1, 0] }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onAnimationComplete={() => setBoom(null)}
              style={{ position: "absolute", left: `${boom.x}%`, top: "45%", translateX: "-50%" }}
              className="text-5xl z-30 pointer-events-none"
            >
              💥
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start screen */}
        {phase === "IDLE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl z-40">
            <h1 className="font-black text-3xl text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-indigo-600 to-pink-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              🥷 NINJA<br />TOKEN
            </h1>
            <p className="text-[11px] text-muted-foreground text-center px-6 leading-relaxed">
              Slice 🟡 gold tokens for <strong>+10 pts</strong>.<br />
              Avoid 💣 bombs — one tap ends the run.<br />
              Don't let gold tokens escape, or lose a ❤️!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-105 transition-transform"
            >
              🥷 TAP TO START
            </button>
          </div>
        )}

        {/* Game over screen */}
        {phase === "GAME_OVER" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl z-40">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-300 text-center mt-4">Game Over</p>
            {boom == null && (
              <div className="rounded-xl px-10 py-5 flex flex-col items-center gap-1 bg-white/70 dark:bg-slate-800/80 border border-border shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Final Score</p>
                <p className="font-black text-5xl tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-pink-500">{score}</p>
                {isNewBest && <p className="text-[10px] font-bold text-emerald-500 mt-0.5 animate-pulse">⭐ New Personal Best!</p>}
                {saving ? (
                  <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Saving score...</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">Score saved ✓</p>
                )}
              </div>
            )}
            <button
              onClick={startGame}
              disabled={saving}
              className="mt-3 mb-4 w-full max-w-[240px] px-4 py-3 rounded-lg font-black text-sm tracking-widest uppercase bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {saving ? "SAVING..." : "Play Again"}
            </button>
          </div>
        )}
      </div>

      {/* Static hint */}
      <p className="text-center text-xs text-muted-foreground px-2">
        ⚡ Tap gold tokens fast — they speed up as your score climbs. Miss 3 and it's over!
      </p>
    </div>
  );
}