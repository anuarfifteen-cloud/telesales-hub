import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

// ── Neon NinJump — canvas + rAF endless climber ───────────────────────────────
const BG = "#080014";
const GRID_COLOR = "rgba(139, 92, 246, 0.07)";
const WALL_COLOR = "#c084fc";
const WALL_GLOW = "#a855f7";

const WALL_PAD = 26;       // how far ninja / oni sit from the glowing wall
const NINJA_FONT = 32;
const ENEMY_FONT = 30;
const BOMB_FONT = 28;
const DASH_TIME = 0.16;   // seconds for a wall-to-wall dash
const REST_DEATH_TOL = 24; // resting overlap with oni → death
const KILL_TOL = 34;       // dash slash vertical tolerance
const BOMB_X_TOL = 22;
const BOMB_Y_TOL = 28;

const CANDY = ["#ff4d6d", "#22d3ee", "#a855f7", "#facc15", "#34d399", "#fb7185"];

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function NinjaTokenGame({ user /* , onUserUpdate */ }) {
  const [phase, setPhase] = useState("IDLE"); // IDLE | PLAYING | GAME_OVER
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalRun, setFinalRun] = useState(0);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const sizeRef = useRef({ w: 320, h: 460, dpr: 1 });

  const phaseRef = useRef("IDLE");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Game world (mutable, not React state)
  const worldRef = useRef(null);
  const scoreIntRef = useRef(0);

  const refreshLeaders = useCallback(async () => {
    try {
      const rows = await base44.entities.NinjaTokenScore.list("-score", 5);
      setLeaders(rows || []);
    } catch {
      setLeaders([]);
    } finally {
      setLeadersLoading(false);
    }
  }, []);

  // Load personal best + hall of fame on mount
  useEffect(() => {
    (async () => {
      if (user?.id) {
        try {
          const rows = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
          setBest(rows[0]?.score ?? 0);
        } catch {
          setBest(0);
        }
      }
      refreshLeaders();
    })();
    const unsub = base44.entities.NinjaTokenScore.subscribe(() => refreshLeaders());
    return unsub;
  }, [user?.id, refreshLeaders]);

  // ── Canvas sizing (DPR-aware, responsive) ────────────────────────────────────
  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = 460;
    sizeRef.current = { w, h, dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // ── Input ────────────────────────────────────────────────────────────────────
  const tryDash = useCallback(() => {
    const w = worldRef.current;
    if (!w || phaseRef.current !== "PLAYING" || w.ninja.dashing) return;
    const { w: W } = sizeRef.current;
    w.ninja.dashing = true;
    w.ninja.dashT = 0;
    w.ninja.srcX = w.ninja.wall === "left" ? WALL_PAD : W - WALL_PAD;
    w.ninja.destWall = w.ninja.wall === "left" ? "right" : "left";
    w.ninja.destX = w.ninja.destWall === "left" ? WALL_PAD : W - WALL_PAD;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        tryDash();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryDash]);

  // ── Game lifecycle ───────────────────────────────────────────────────────────
  const makeWorld = () => {
    const { w: W, h: H } = sizeRef.current;
    return {
      ninja: {
        wall: "left",
        x: WALL_PAD,
        y: H * 0.72,
        dashing: false,
        dashT: 0,
        srcX: WALL_PAD,
        destX: W - WALL_PAD,
        destWall: "right",
      },
      entities: [],
      elapsed: 0,
      scrollSpeed: 110,
      spawnTimer: 0,
      spawnInterval: 1.15,
      particles: [],
    };
  };

  const upsertScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        const name = user.full_name || (user.email ? user.email.split("@")[0] : "Player");
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
        await refreshLeaders();
        try {
          const me = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
          setBest(me[0]?.score ?? finalScore);
        } catch {}
      } catch (e) {
        console.error("[NinjaToken] upsert failed:", e?.message || e);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, user?.full_name, user?.email, refreshLeaders]
  );

  const gameOver = useCallback(
    (finalScore) => {
      if (phaseRef.current !== "PLAYING") return;
      phaseRef.current = "GAME_OVER";
      setFinalRun(finalScore);
      setIsNewBest(best == null ? true : finalScore > best);
      setPhase("GAME_OVER");
      upsertScore(finalScore);
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    },
    [best, upsertScore]
  );

  const startGame = useCallback(() => {
    worldRef.current = makeWorld();
    scoreIntRef.current = 0;
    setScore(0);
    setIsNewBest(false);
    setFinalRun(0);
    phaseRef.current = "PLAYING";
    setPhase("PLAYING");
    lastRef.current = performance.now();
  }, []);

  // ── Main loop (runs always; updates only while PLAYING) ─────────────────────
  const update = useCallback(
    (dt) => {
      const w = worldRef.current;
      if (!w) return;
      const { w: W, h: H } = sizeRef.current;
      const restY = H * 0.72;

      w.elapsed += dt;
      // Difficulty ramp
      w.scrollSpeed = Math.min(320, 110 + w.elapsed * 4.2);
      w.spawnInterval = Math.max(0.55, 1.15 - w.elapsed * 0.018);

      // Score from climbing distance
      w._climb = (w._climb || 0) + w.scrollSpeed * dt * 0.06;
      const intScore = Math.floor(w._climb) + w._bonus * 10;
      if (intScore !== scoreIntRef.current) {
        scoreIntRef.current = intScore;
        setScore(intScore);
      }

      // Dash movement
      if (w.ninja.dashing) {
        w.ninja.dashT += dt;
        const p = Math.min(1, w.ninja.dashT / DASH_TIME);
        w.ninja.x = w.ninja.srcX + (w.ninja.destX - w.ninja.srcX) * easeOut(p);
        if (p >= 1) {
          w.ninja.dashing = false;
          w.ninja.wall = w.ninja.destWall;
          w.ninja.x = w.ninja.destX;
        }
      }

      // Move entities down (camera pans up)
      for (const e of w.entities) {
        e.y += (e.type === "bomb" ? w.scrollSpeed * 1.18 : w.scrollSpeed) * dt;
      }
      // Cull off-screen
      w.entities = w.entities.filter((e) => e.y < H + 50);

      // Spawn
      w.spawnTimer += dt;
      if (w.spawnTimer >= w.spawnInterval) {
        w.spawnTimer = 0;
        const bomb = Math.random() < 0.4;
        if (bomb) {
          w.entities.push({
            type: "bomb",
            x: W * 0.3 + Math.random() * (W * 0.4),
            y: -40,
            dead: false,
          });
        } else {
          const wall = Math.random() < 0.5 ? "left" : "right";
          w.entities.push({
            type: "oni",
            wall,
            x: wall === "left" ? WALL_PAD : W - WALL_PAD,
            y: -40,
            dead: false,
          });
        }
      }

      // ── Collisions ──────────────────────────────────────────────────────────
      const nx = w.ninja.x;
      if (w.ninja.dashing) {
        // Attacking: slash oni at ninja height on any wall
        for (const e of w.entities) {
          if (e.type === "oni" && !e.dead && Math.abs(e.y - restY) < KILL_TOL) {
            e.dead = true;
            w._bonus = (w._bonus || 0) + 1;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.4 });
            if (navigator.vibrate) navigator.vibrate(12);
          }
          // Bombs in the dash path kill
          if (e.type === "bomb" && !e.dead && Math.abs(e.y - restY) < BOMB_Y_TOL && Math.abs(e.x - nx) < BOMB_X_TOL) {
            gameOver(Math.floor(w._climb) + (w._bonus || 0) * 10);
            return;
          }
        }
      } else {
        // Resting: oni on the same wall kills on overlap; bombs in middle are safe
        for (const e of w.entities) {
          if (e.type === "oni" && e.wall === w.ninja.wall && Math.abs(e.y - restY) < REST_DEATH_TOL) {
            gameOver(Math.floor(w._climb) + (w._bonus || 0) * 10);
            return;
          }
        }
      }
      // Remove dead onis after marking for a beat (they'll cull by y too)
      w.entities = w.entities.filter((e) => !e.dead);
      // Particles
      for (const p of w.particles) p.t += dt;
      w.particles = w.particles.filter((p) => p.t < p.life);
    },
    [gameOver]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { w: W, h: H } = sizeRef.current;
    const w = worldRef.current;

    // Background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Subtle scrolling grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const grid = 34;
    const offset = w ? (w.elapsed * w.scrollSpeed) % grid : 0;
    ctx.beginPath();
    for (let x = 0; x <= W; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = -grid + (offset % grid); y <= H; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Neon glowing walls
    ctx.save();
    ctx.shadowColor = WALL_GLOW;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(2, H);
    ctx.moveTo(W - 2, 0);
    ctx.lineTo(W - 2, H);
    ctx.stroke();
    ctx.restore();

    if (!w) return;

    // Dash slash trail
    if (w.ninja.dashing) {
      ctx.save();
      ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w.ninja.srcX, w.ninja.y);
      ctx.lineTo(w.ninja.x, w.ninja.y);
      ctx.stroke();
      ctx.restore();
    }

    // Entities
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of w.entities) {
      ctx.font = `${ENEMY_FONT}px serif`;
      ctx.fillText(e.type === "oni" ? "👹" : "💣", e.x, e.y);
    }

    // Ninja
    ctx.font = `${NINJA_FONT}px serif`;
    ctx.fillText("🥷", w.ninja.x, w.ninja.y);

    // Kill particles (small star burst)
    for (const p of w.particles) {
      const a = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + p.t * 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  // rAF loop — started once on mount, always renders, updates only while playing
  const loop = useCallback(
    (t) => {
      const dt = Math.min(0.05, (t - lastRef.current) / 1000 || 0);
      lastRef.current = t;
      if (phaseRef.current === "PLAYING") update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    },
    [update, render]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const medals = ["🥇", "🥈", "🥉"];
  const displayName = user?.full_name || user?.email || "Player";
  const shownBest = best == null ? finalRun : Math.max(best, finalRun);

  return (
    <div className="rounded-3xl border border-[#2a1a4a] bg-[#080014] overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.25)] font-mono">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 text-center border-b border-[#2a1a4a]">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">🥷</span>
          <div className="leading-none">
            <h1 className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-cyan-300">
              NINJA TOKEN
            </h1>
            <p className="mt-0.5 text-[9px] tracking-[0.4em] text-purple-400/70">BETA ARCADE</p>
          </div>
          <span className="text-2xl scale-x-[-1]">🥷</span>
        </div>
        {/* 6 colored dots */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {CANDY.map((c, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: c, boxShadow: `0 0 8px ${c}` }}
            />
          ))}
        </div>
      </div>

      {/* Arena */}
      <div
        ref={wrapRef}
        className="relative w-full select-none"
        style={{ height: 460 }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.preventDefault();
            tryDash();
          }}
          style={{ touchAction: "none" }}
          className="block w-full h-full"
        />

        {/* Live score chip */}
        {(phase === "PLAYING" || phase === "GAME_OVER") && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#120a26]/80 border border-purple-500/40 backdrop-blur text-center">
            <span className="text-[9px] tracking-[0.3em] text-purple-300/80">SCORE</span>
            <span className="ml-2 text-lg font-black text-cyan-300 tabular-nums">{score}</span>
          </div>
        )}

        {/* Start overlay */}
        {phase === "IDLE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#080014]/85 backdrop-blur-sm">
            <p className="text-xs tracking-[0.3em] text-purple-300/80 text-center px-6 leading-relaxed">
              Tap to dash between walls.<br />
              Slash 👹 for +10. Avoid 💣 in the open air.<br />
              Don't let 👹 hit you while resting!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl font-black text-sm tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:scale-105 transition-transform"
            >
              ▶ TAP TO START
            </button>
            {best != null && best > 0 && (
              <p className="text-[10px] tracking-[0.3em] text-amber-300/80">BEST: {best}</p>
            )}
          </div>
        )}

        {/* Game Over modal */}
        {phase === "GAME_OVER" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 bg-[#080014]/80 backdrop-blur-md">
            <h2 className="text-2xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-red-500">
              GAME OVER
            </h2>

            {isNewBest && (
              <span className="px-4 py-1 rounded-full font-black text-[11px] tracking-[0.2em] bg-gradient-to-r from-amber-300 to-yellow-500 text-[#1a0b2e] shadow-[0_0_18px_rgba(250,204,21,0.7)]">
                ⭐ NEW HIGH SCORE ⭐
              </span>
            )}

            {/* Score box */}
            <div className="w-full max-w-[260px] rounded-2xl border border-purple-500/40 bg-[#120a26]/90 px-5 py-3 text-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <p className="text-[9px] tracking-[0.3em] text-purple-300/70">FINAL SCORE</p>
              <p className="text-3xl font-black text-cyan-300 tabular-nums">{finalRun}</p>
              <p className="mt-1 text-[9px] tracking-[0.3em] text-amber-300/80">BEST: {shownBest}</p>
            </div>

            {/* Hall of Fame */}
            <div className="w-full max-w-[280px] rounded-2xl border border-fuchsia-500/30 bg-[#0c0420]/90 overflow-hidden">
              <div className="px-4 py-2 text-center border-b border-fuchsia-500/20">
                <p className="text-xs font-black tracking-[0.2em] text-fuchsia-300">🏆 HALL OF FAME 🏆</p>
              </div>
              {leadersLoading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                </div>
              ) : leaders.length === 0 ? (
                <p className="py-4 text-center text-[10px] tracking-widest text-purple-300/50 uppercase">
                  No scores yet
                </p>
              ) : (
                <div className="divide-y divide-fuchsia-500/10">
                  {leaders.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="w-5 text-center text-sm">{i < 3 ? medals[i] : `${i + 1}`}</span>
                      <span className="flex-1 min-w-0 text-xs font-bold text-purple-100 truncate" style={{ wordBreak: "break-word" }}>
                        {l.user_name}
                      </span>
                      <span className="text-xs font-black text-cyan-300 tabular-nums">{l.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={startGame}
                disabled={saving}
                className="flex-1 px-5 py-2.5 rounded-xl font-black text-sm tracking-[0.15em] bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶ PLAY AGAIN"}
              </button>
              <button
                className="px-4 py-2.5 rounded-xl font-black text-sm tracking-[0.15em] border-2 border-purple-500/50 text-purple-300 bg-transparent hover:bg-purple-500/10 transition-colors"
                title={`Playing as ${displayName}`}
              >
                CHANGE NAME
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-3 border-t border-[#2a1a4a] flex items-center justify-center gap-2 text-[10px] tracking-[0.15em] text-purple-300/70">
        <span className="text-base leading-none">🥷</span>
        <span className="text-base leading-none">👹</span>
        <span className="text-base leading-none">💣</span>
        <span className="ml-1 text-cyan-300/80">SPACE • CLICK • TAP — DASH TO ATTACK</span>
      </div>
    </div>
  );
}