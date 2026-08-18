import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy } from "lucide-react";

// ── Ninja Token — theme-aware canvas NinJump climber ───────────────────────────
const WALL_PAD = 26;        // distance ninja / oni sit from the wall
const NINJA_FONT = 32;
const ENEMY_FONT = 30;
const DASH_TIME = 0.16;     // seconds for a wall-to-wall dash
const REST_DEATH_TOL = 24;  // resting overlap with oni → death
const KILL_TOL = 34;        // dash slash vertical tolerance
const BOMB_X_TOL = 26;      // bomb resting proximity to ninja wall lane → lethal
const BOMB_Y_TOL = 30;

// Difficulty: 2× the original base, +step every 500 pts
const BASE_SPEED = 220;
const SPEED_STEP = 90;

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
  const tokensRef = useRef({
    bg: "hsl(0 0% 97%)",
    gridFg: "0 0% 0%",
    wall: "hsl(221 83% 53%)",
    score: "hsl(221 83% 53%)",
  });

  const phaseRef = useRef("IDLE");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const worldRef = useRef(null);
  const scoreIntRef = useRef(0);

  // ── Theme tokens (read from CSS variables so canvas adapts to light/dark + theme) ─
  const readTokens = useCallback(() => {
    const root = document.documentElement;
    const cs = window.getComputedStyle(root);
    const get = (n) => cs.getPropertyValue(n).trim();
    tokensRef.current = {
      bg: `hsl(${get("--background")})`,
      gridFg: get("--foreground"),
      wall: `hsl(${get("--primary")})`,
      score: `hsl(${get("--primary")})`,
    };
  }, []);

  useEffect(() => {
    readTokens();
    const obs = new MutationObserver(readTokens);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, [readTokens]);

  // ── Leaderboards ───────────────────────────────────────────────────────────
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
      spawnTimer: 0,
      climb: 0,
      killPoints: 0,
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

      // Live score-driven speed: +step every 500 pts
      const currentInt = Math.floor(w.climb) + w.killPoints;
      const tier = Math.floor(currentInt / 500);
      const speed = BASE_SPEED + tier * SPEED_STEP;
      const spawnInterval = Math.max(0.45, 1.1 - tier * 0.12);
      w._speed = speed;

      // Climb accrual
      w.climb += speed * dt * 0.06;
      const intScore = Math.floor(w.climb) + w.killPoints;
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
        e.y += (e.type === "bomb" ? speed * 1.18 : speed) * dt;
      }
      w.entities = w.entities.filter((e) => e.y < H + 50 && !e._cull);

      // Spawn
      w.spawnTimer += dt;
      if (w.spawnTimer >= spawnInterval) {
        w.spawnTimer = 0;
        const bomb = Math.random() < 0.45;
        if (bomb) {
          // Bombs can fall across the full width: wall-lane ones threaten a resting ninja,
          // middle ones are safe to ignore or reward +100 if dashed through.
          w.entities.push({
            type: "bomb",
            x: WALL_PAD + Math.random() * (W - 2 * WALL_PAD),
            y: -40,
            sliced: false,
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
        // Attacking across the full width: slash oni at ninja height (+10) and slice
        // bombs at ninja height (+100). Nothing is lethal while dashing.
        for (const e of w.entities) {
          if (e.type === "oni" && !e.dead && Math.abs(e.y - restY) < KILL_TOL) {
            e.dead = true;
            w.killPoints += 10;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.4 });
            if (navigator.vibrate) navigator.vibrate(12);
          }
          if (e.type === "bomb" && !e.sliced && Math.abs(e.y - restY) < BOMB_Y_TOL) {
            e.sliced = true;
            e._cull = true;
            w.killPoints += 100;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.45, gold: true });
            if (navigator.vibrate) navigator.vibrate(18);
          }
        }
      } else {
        // Resting: oni on the same wall → death; an un-sliced bomb reaching the
        // ninja's wall lane → death (ignored bomb). Bombs in the middle pass safely.
        for (const e of w.entities) {
          if (e.type === "oni" && e.wall === w.ninja.wall && Math.abs(e.y - restY) < REST_DEATH_TOL) {
            gameOver(Math.floor(w.climb) + w.killPoints);
            return;
          }
          if (
            e.type === "bomb" &&
            !e.sliced &&
            Math.abs(e.y - restY) < BOMB_Y_TOL &&
            Math.abs(e.x - nx) < BOMB_X_TOL
          ) {
            gameOver(Math.floor(w.climb) + w.killPoints);
            return;
          }
        }
      }
      // Remove dead onis
      w.entities = w.entities.filter((e) => !(e.type === "oni" && e.dead));
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
    const tk = tokensRef.current;

    // Background (theme-aware)
    ctx.fillStyle = tk.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle scrolling grid
    ctx.strokeStyle = `hsl(${tk.gridFg} / 0.08)`;
    ctx.lineWidth = 1;
    const grid = 34;
    const offset = w ? (w.elapsed * (w._speed || BASE_SPEED)) % grid : 0;
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

    // Neon walls (primary token glow)
    ctx.save();
    ctx.shadowColor = tk.wall;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = tk.wall;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(2, H);
    ctx.moveTo(W - 2, 0);
    ctx.lineTo(W - 2, H);
    ctx.stroke();
    ctx.restore();

    if (w) {
      // Dash slash trail
      if (w.ninja.dashing) {
        ctx.save();
        ctx.strokeStyle = tk.wall;
        ctx.globalAlpha = 0.5;
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

      // Kill particles
      for (const p of w.particles) {
        const a = 1 - p.t / p.life;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.gold ? "#facc15" : tk.wall;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 + p.t * 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Live on-canvas score (PLAYING only) — big glowing neon, theme-tinted
      if (phaseRef.current === "PLAYING") {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = "bold 34px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.shadowColor = tk.score;
        ctx.shadowBlur = 16;
        ctx.fillStyle = tk.score;
        ctx.fillText(String(scoreIntRef.current), W / 2, 16);
        ctx.restore();
      }
    }
  }, []);

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
  const top3 = leaders.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      {/* Live Top-3 leaderboard — above the arena */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/50 flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-foreground font-mono">Top Ninjas</p>
        </div>
        {leadersLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : top3.length === 0 ? (
          <p className="py-4 text-center text-[11px] tracking-widest uppercase text-muted-foreground font-mono">
            No scores yet — be the first!
          </p>
        ) : (
          <div className="divide-y divide-border">
            {top3.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 text-center text-base">{medals[i]}</span>
                <span className="flex-1 min-w-0 text-sm font-bold text-foreground truncate font-mono" style={{ wordBreak: "break-word" }}>
                  {l.user_name}
                </span>
                <span className="text-sm font-black text-primary tabular-nums font-mono">{l.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arena shell — fully theme-aware */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm font-mono">
        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 text-center border-b border-border">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🥷</span>
            <div className="leading-none">
              <h1 className="text-lg font-black tracking-[0.2em] text-foreground">
                NINJA TOKEN
              </h1>
              <p className="mt-0.5 text-[9px] tracking-[0.4em] text-muted-foreground">BETA ARCADE</p>
            </div>
            <span className="text-xl scale-x-[-1]">🥷</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {[0.9, 0.72, 0.55, 0.4, 0.55, 0.72].map((o, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ opacity: o }}
              />
            ))}
          </div>
        </div>

        {/* Canvas arena */}
        <div ref={wrapRef} className="relative w-full select-none" style={{ height: 460 }}>
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              tryDash();
            }}
            style={{ touchAction: "none" }}
            className="block w-full h-full"
          />

          {/* Start overlay */}
          {phase === "IDLE" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/85 backdrop-blur-sm px-6">
              <p className="text-xs tracking-[0.15em] text-muted-foreground text-center leading-relaxed font-mono">
                Tap to dash between walls.<br />
                Slash 👹 for +10 · Slice 💣 mid-air for +100.<br />
                Don't let an oni hit you while resting — and don't ignore a bomb on your wall!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 rounded-xl font-black text-sm tracking-[0.2em] bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
              >
                ▶ TAP TO START
              </button>
              {best != null && best > 0 && (
                <p className="text-[10px] tracking-[0.3em] text-muted-foreground font-mono">BEST: {best}</p>
              )}
            </div>
          )}

          {/* Game Over modal */}
          {phase === "GAME_OVER" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 bg-card/80 backdrop-blur-md">
              <h2 className="text-2xl font-black tracking-[0.3em] text-destructive font-mono">
                GAME OVER
              </h2>

              {isNewBest && (
                <span className="px-4 py-1 rounded-full font-black text-[11px] tracking-[0.2em] bg-primary text-primary-foreground shadow-md">
                  ⭐ NEW HIGH SCORE ⭐
                </span>
              )}

              {/* Score box */}
              <div className="w-full max-w-[260px] rounded-2xl border border-border bg-background/90 px-5 py-3 text-center shadow-md">
                <p className="text-[9px] tracking-[0.3em] text-muted-foreground font-mono">FINAL SCORE</p>
                <p className="text-3xl font-black text-foreground tabular-nums font-mono">{finalRun}</p>
                <p className="mt-1 text-[9px] tracking-[0.3em] text-muted-foreground font-mono">BEST: {shownBest}</p>
              </div>

              {/* Hall of Fame (Top 5) */}
              <div className="w-full max-w-[280px] rounded-2xl border border-border bg-background/90 overflow-hidden">
                <div className="px-4 py-2 text-center border-b border-border">
                  <p className="text-xs font-black tracking-[0.2em] text-foreground font-mono">🏆 HALL OF FAME 🏆</p>
                </div>
                {leadersLoading ? (
                  <div className="py-3 flex justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : leaders.length === 0 ? (
                  <p className="py-3 text-center text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                    No scores yet
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {leaders.map((l, i) => (
                      <div key={l.id} className="flex items-center gap-2 px-3 py-1.5">
                        <span className="w-5 text-center text-sm">{i < 3 ? medals[i] : `${i + 1}`}</span>
                        <span className="flex-1 min-w-0 text-xs font-bold text-foreground truncate font-mono" style={{ wordBreak: "break-word" }}>
                          {l.user_name}
                        </span>
                        <span className="text-xs font-black text-primary tabular-nums font-mono">{l.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Single action — CHANGE NAME removed */}
              <button
                onClick={startGame}
                disabled={saving}
                className="mt-1 w-full max-w-[260px] px-5 py-2.5 rounded-xl font-black text-sm tracking-[0.15em] bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 font-mono"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶ PLAY AGAIN"}
              </button>
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-center gap-2 text-[10px] tracking-[0.12em] text-muted-foreground font-mono">
          <span className="text-base leading-none">🥷</span>
          <span className="text-base leading-none">👹</span>
          <span className="text-base leading-none">💣</span>
          <span className="ml-1">SPACE • CLICK • TAP — DASH TO ATTACK</span>
        </div>
      </div>
    </div>
  );
}