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

// Golden Temple Dawn palette
const RAIL = "#5a3a1a";
const RUNG = "#7a4f24";
const TEMPLE = "rgba(139, 90, 43, 0.30)";
const PILL_BG = "#EDE3CE";
const PILL_BORDER = "#3a2a1a";
const PILL_TEXT = "#3a2a1a";
const TOKEN_TOL = 34;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Pagoda silhouette: stacked rect bases + triangle roofs
function drawTemple(ctx, cx, baseY, w, h) {
  ctx.fillStyle = TEMPLE;
  ctx.fillRect(cx - w / 2, baseY - h * 0.32, w, h * 0.32);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.6, baseY - h * 0.32);
  ctx.lineTo(cx + w * 0.6, baseY - h * 0.32);
  ctx.lineTo(cx, baseY - h * 0.54);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - w * 0.34, baseY - h * 0.6, w * 0.68, h * 0.18);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.46, baseY - h * 0.6);
  ctx.lineTo(cx + w * 0.46, baseY - h * 0.6);
  ctx.lineTo(cx, baseY - h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - w * 0.06, baseY - h * 0.84, w * 0.12, h * 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, baseY - h * 0.84);
  ctx.lineTo(cx + w * 0.18, baseY - h * 0.84);
  ctx.lineTo(cx, baseY - h);
  ctx.closePath();
  ctx.fill();
}

let _actx = null;
function playPing() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_actx) _actx = new AC();
    const ctx = _actx;
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(880, t0);
    o.frequency.exponentialRampToValueAtTime(1760, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.26);
  } catch {}
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

  const worldRef = useRef(null);
  const scoreIntRef = useRef(0);

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
        const roll = Math.random();
        if (roll < 0.5) {
          const wall = Math.random() < 0.5 ? "left" : "right";
          w.entities.push({
            type: "oni",
            wall,
            x: wall === "left" ? WALL_PAD : W - WALL_PAD,
            y: -40,
            dead: false,
          });
        } else if (roll < 0.82) {
          // Bombs fall across the full width: wall-lane ones threaten a resting ninja,
          // middle ones are safe to ignore or reward +100 if dashed through.
          w.entities.push({
            type: "bomb",
            x: WALL_PAD + Math.random() * (W - 2 * WALL_PAD),
            y: -40,
            sliced: false,
          });
        } else {
          // Golden Token — falls through the open middle air; dash through for +200.
          w.entities.push({
            type: "token",
            x: W * 0.28 + Math.random() * (W * 0.44),
            y: -40,
            taken: false,
          });
        }
      }

      // ── Collisions ──────────────────────────────────────────────────────────
      const nx = w.ninja.x;
      if (w.ninja.dashing) {
        // Attacking across the full width: slash oni (+10), slice bombs (+100), and
        // collect Golden Tokens (+200). Nothing is lethal while dashing.
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
          if (e.type === "token" && !e.taken && Math.abs(e.y - restY) < TOKEN_TOL) {
            e.taken = true;
            e._cull = true;
            w.killPoints += 200;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.5, gold: true, big: true });
            playPing();
            if (navigator.vibrate) navigator.vibrate([20, 15, 40]);
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

    // Sky gradient — Golden Temple Dawn
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#FDE093");
    sky.addColorStop(1, "#D48E36");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Parallax pagoda silhouettes (near-static, slow drift)
    const drift = w ? w.elapsed * 6 : 0;
    drawTemple(ctx, W * 0.2 - ((drift * 0.04) % 120), H * 0.82, 58, 96);
    drawTemple(ctx, W * 0.55, H * 0.82 - 6, 80, 128);
    drawTemple(ctx, W * 0.92, H * 0.82, 48, 86);

    // Wooden-ladder walls (rails + scrolling rungs)
    ctx.save();
    ctx.fillStyle = RAIL;
    ctx.fillRect(2, 0, 6, H);
    ctx.fillRect(W - 8, 0, 6, H);
    const step = 36;
    const off = w ? (w.elapsed * (w._speed || BASE_SPEED)) % step : 0;
    ctx.fillStyle = RUNG;
    for (let y = -step + (off % step); y < H; y += step) {
      ctx.fillRect(2, y, 26, 4);
      ctx.fillRect(W - 28, y, 26, 4);
    }
    ctx.restore();

    if (w) {
      // Dash slash trail (sepia)
      if (w.ninja.dashing) {
        ctx.save();
        ctx.strokeStyle = "rgba(90, 58, 26, 0.5)";
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
        if (e.type === "token") {
          // Shiny gold coin
          const r = 14;
          const g = ctx.createRadialGradient(e.x - 4, e.y - 4, 2, e.x, e.y, r);
          g.addColorStop(0, "#FFF6C8");
          g.addColorStop(0.5, "#FFD24A");
          g.addColorStop(1, "#B8860B");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#8a6d1a";
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(e.x - 4, e.y - 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "bold 15px serif";
          ctx.fillStyle = "#8a6d1a";
          ctx.fillText("✦", e.x, e.y + 1);
        } else {
          ctx.font = `${ENEMY_FONT}px serif`;
          ctx.fillText(e.type === "oni" ? "👹" : "💣", e.x, e.y);
        }
      }

      // Ninja
      ctx.font = `${NINJA_FONT}px serif`;
      ctx.fillText("🥷", w.ninja.x, w.ninja.y);

      // Kill particles (gold pop for coins/bombs)
      for (const p of w.particles) {
        const a = 1 - p.t / p.life;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.gold ? "#FFD24A" : "#5a3a1a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.big ? 10 : 6) + p.t * 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Top pill score (PLAYING only)
      if (phaseRef.current === "PLAYING") {
        const txt = String(scoreIntRef.current);
        ctx.save();
        ctx.font = "bold 26px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(txt).width;
        const pw = tw + 44, ph = 40, px = W / 2 - pw / 2, py = 16;
        ctx.fillStyle = PILL_BG;
        ctx.strokeStyle = PILL_BORDER;
        ctx.lineWidth = 2;
        roundRect(ctx, px, py, pw, ph, ph / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PILL_TEXT;
        ctx.fillText(txt, W / 2, py + ph / 2 + 1);
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

      {/* Arena shell — Golden Temple Dawn */}
      <div className="rounded-3xl border border-[#B8860B] bg-[#FDE093] overflow-hidden shadow-md font-mono">
        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 text-center border-b border-[#B8860B]/50">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🥷</span>
            <div className="leading-none">
              <h1 className="text-lg font-black tracking-[0.2em] text-[#3a2a1a]">
                NINJA TOKEN
              </h1>
              <p className="mt-0.5 text-[9px] tracking-[0.4em] text-[#7a3b00]">BETA ARCADE</p>
            </div>
            <span className="text-xl scale-x-[-1]">🥷</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {[0.9, 0.72, 0.55, 0.4, 0.55, 0.72].map((o, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#B8860B]"
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#FDE093]/80 backdrop-blur-sm px-6">
              <p className="text-xs tracking-[0.15em] text-[#3a2a1a] text-center leading-relaxed font-mono">
                Dash between walls.<br />
                Slash 👹 +10 · Slice 💣 +100 · Snag 🪙 +200.<br />
                Don't let an oni hit you while resting — and don't ignore a bomb on your wall!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 rounded-xl font-black text-sm tracking-[0.2em] bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:scale-105 transition-transform"
              >
                ▶ TAP TO START
              </button>
              {best != null && best > 0 && (
                <p className="text-[10px] tracking-[0.3em] text-[#7a3b00] font-mono">BEST: {best}</p>
              )}
            </div>
          )}

          {/* Game Over modal */}
          {phase === "GAME_OVER" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 bg-[#FDE093]/85 backdrop-blur-md">
              <h2 className="text-2xl font-black tracking-[0.3em] text-[#7a3b00] font-mono">
                GAME OVER
              </h2>

              {isNewBest && (
                <span className="px-4 py-1 rounded-full font-black text-[11px] tracking-[0.2em] bg-gradient-to-r from-amber-300 to-yellow-500 text-[#5a3a1a] shadow-md">
                  ⭐ NEW HIGH SCORE ⭐
                </span>
              )}

              {/* Score box */}
              <div className="w-full max-w-[260px] rounded-2xl border border-[#B8860B] bg-[#FFF7E0]/95 px-5 py-3 text-center shadow-md">
                <p className="text-[9px] tracking-[0.3em] text-[#7a3b00] font-mono">FINAL SCORE</p>
                <p className="text-3xl font-black text-[#3a2a1a] tabular-nums font-mono">{finalRun}</p>
                <p className="mt-1 text-[9px] tracking-[0.3em] text-[#7a3b00] font-mono">BEST: {shownBest}</p>
              </div>

              {/* Hall of Fame (Top 5) */}
              <div className="w-full max-w-[280px] rounded-2xl border border-[#B8860B] bg-[#FFF7E0]/95 overflow-hidden">
                <div className="px-4 py-2 text-center border-b border-[#B8860B]/60">
                  <p className="text-xs font-black tracking-[0.2em] text-[#7a3b00] font-mono">🏆 HALL OF FAME 🏆</p>
                </div>
                {leadersLoading ? (
                  <div className="py-3 flex justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7a3b00]" />
                  </div>
                ) : leaders.length === 0 ? (
                  <p className="py-3 text-center text-[10px] tracking-widest text-[#7a3b00]/70 uppercase font-mono">
                    No scores yet
                  </p>
                ) : (
                  <div className="divide-y divide-[#B8860B]/40">
                    {leaders.map((l, i) => (
                      <div key={l.id} className="flex items-center gap-2 px-3 py-1.5">
                        <span className="w-5 text-center text-sm">{i < 3 ? medals[i] : `${i + 1}`}</span>
                        <span className="flex-1 min-w-0 text-xs font-bold text-[#3a2a1a] truncate font-mono" style={{ wordBreak: "break-word" }}>
                          {l.user_name}
                        </span>
                        <span className="text-xs font-black text-[#B8860B] tabular-nums font-mono">{l.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Single action — CHANGE NAME removed */}
              <button
                onClick={startGame}
                disabled={saving}
                className="mt-1 w-full max-w-[260px] px-5 py-2.5 rounded-xl font-black text-sm tracking-[0.15em] bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 font-mono"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶ PLAY AGAIN"}
              </button>
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className="px-4 py-2.5 border-t border-[#B8860B]/50 flex items-center justify-center gap-2 text-[10px] tracking-[0.12em] text-[#7a3b00] font-mono">
          <span className="text-base leading-none">🥷</span>
          <span className="text-base leading-none">👹</span>
          <span className="text-base leading-none">💣</span>
          <span className="text-base leading-none text-[#B8860B]">🪙</span>
          <span className="ml-1">SPACE • CLICK • TAP — DASH TO ATTACK</span>
        </div>
      </div>
    </div>
  );
}