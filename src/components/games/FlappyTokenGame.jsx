import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy } from "lucide-react";

const W = 360;
const H = 500;
const BIRD_X = 70;
const BIRD_R = 16;
const PIPE_W = 54;

// Optimized Delta-Time values for perfectly smooth cross-platform speeds
const DIFFICULTY_SETTINGS = {
  easy:   { gravity: 850,  jumpVel: -280, pipeGap: 170, pipeSpeed: 114, pipeIntervalMs: 1750 },
  medium: { gravity: 1050, jumpVel: -310, pipeGap: 145, pipeSpeed: 144, pipeIntervalMs: 1500 },
  hard:   { gravity: 1250, jumpVel: -340, pipeGap: 145, pipeSpeed: 192, pipeIntervalMs: 1200 },
};

const TOKEN_IMG_URL = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";

// ── Stars ────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5, a: 0.3 + Math.random() * 0.7,
}));

// ── Audio ────────────────────────────────────────────────────────────────────
function createAudio() {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function playTone(freq, type, duration, vol = 0.15) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = type; osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime); osc.stop(c.currentTime + duration);
    } catch (_) {}
  }
  return {
    jump: () => playTone(520, "sine", 0.08, 0.12),
    score: () => { playTone(880, "sine", 0.1, 0.1); setTimeout(() => playTone(1100, "sine", 0.12, 0.12), 80); },
    die: () => { playTone(220, "sawtooth", 0.3, 0.2); setTimeout(() => playTone(150, "sawtooth", 0.4, 0.2), 150); },
    bgLoop: null,
    startBg() {
      try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = "sine"; osc.frequency.setValueAtTime(110, c.currentTime);
        gain.gain.setValueAtTime(0.04, c.currentTime);
        osc.start(); this.bgLoop = { osc, gain, ctx: c };
      } catch (_) {}
    },
    stopBg() {
      try { if (this.bgLoop) { this.bgLoop.gain.gain.setValueAtTime(0, this.bgLoop.ctx.currentTime); this.bgLoop.osc.stop(); this.bgLoop = null; } } catch (_) {}
    }
  };
}
const audio = createAudio();

// ── Draw helpers ─────────────────────────────────────────────────────────────
function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#06001a"); bg.addColorStop(1, "#0a0530");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  STARS.forEach(s => {
    ctx.save(); ctx.globalAlpha = s.a; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
}

function drawPipe(ctx, x, topH, botY) {
  ctx.save();
  ctx.shadowBlur = 22; ctx.shadowColor = "#00e5ff";
  const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  grad.addColorStop(0, "#006070"); grad.addColorStop(0.4, "#00d4f5"); grad.addColorStop(1, "#004f5c");
  ctx.fillStyle = grad;
  ctx.fillRect(x, 0, PIPE_W, topH);
  ctx.fillStyle = "#00e5ff"; ctx.fillRect(x - 5, topH - 14, PIPE_W + 10, 14);
  ctx.fillStyle = grad; ctx.fillRect(x, botY, PIPE_W, H - botY);
  ctx.fillStyle = "#00e5ff"; ctx.fillRect(x - 5, botY, PIPE_W + 10, 14);
  ctx.restore();
}

function drawBird(ctx, y, vel, tokenImg) {
  const tilt = Math.min(Math.max(vel * 0.15, -25), 70);
  ctx.save();
  ctx.translate(BIRD_X, y); ctx.rotate((tilt * Math.PI) / 180);
  ctx.shadowBlur = 20; ctx.shadowColor = "#ffd700";
  if (tokenImg?.complete && tokenImg.naturalWidth > 0) {
    ctx.drawImage(tokenImg, -BIRD_R - 2, -BIRD_R - 2, (BIRD_R + 2) * 2, (BIRD_R + 2) * 2);
  } else {
    ctx.beginPath(); ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc107"; ctx.fill();
    ctx.fillStyle = "#e65100"; ctx.font = "bold 14px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 1);
  }
  ctx.restore();
}

function drawIdleScreen(ctx, pipes, tokenImg) {
  drawBackground(ctx);
  // Draw two idle pipes for decoration
  pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + DIFFICULTY_SETTINGS.medium.pipeGap));
  // Draw coin
  drawBird(ctx, H / 2, 0, tokenImg);
  // TAP TO PLAY text
  ctx.save();
  ctx.shadowBlur = 30; ctx.shadowColor = "#ff00c8";
  ctx.fillStyle = "#ff00c8";
  ctx.font = "bold 30px monospace"; ctx.textAlign = "center";
  ctx.fillText("TAP TO PLAY", W / 2, H / 2 - 60);
  ctx.shadowBlur = 10; ctx.shadowColor = "#00e5ff";
  ctx.fillStyle = "#00e5ff";
  ctx.font = "12px monospace";
  ctx.fillText("CLICK  •  TAP  •  SPACE", W / 2, H / 2 - 32);
  ctx.restore();
}

// ── Live Leaderboard ──────────────────────────────────────────────────────────
function LiveLeaderboard({ currentUserId }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [champUserIds, setChampUserIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, users] = await Promise.all([
      base44.entities.FlappyLeaderboard.list("-score", 10),
      base44.entities.User.list().catch(() => []),
    ]);
    setScores(rows);
    setChampUserIds(new Set(users.filter(u => u.is_defending_champ_flappy).map(u => u.id)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.FlappyLeaderboard.subscribe(() => load());
    return unsub;
  }, [load]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-cyan-500/20 shadow-xl shadow-slate-200/50 dark:shadow-cyan-950/20 overflow-hidden transition-all duration-300">
      {/* Info box */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-cyan-950/40 dark:to-indigo-950/40 border-b border-slate-200 dark:border-cyan-500/20 px-5 py-4">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <Trophy className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Live Cyber Leaderboard</p>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center leading-relaxed">
          The leaderboard resets twice a month (on the 15th and the final day of the month). Be in the Top 3 when the season ends to win:
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2.5">
          <span className="text-[11px] font-bold bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-300">🥇 1st: 5 Tokens</span>
          <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300">🥈 2nd: 2 Tokens</span>
          <span className="text-[11px] font-bold bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300">🥉 3rd: 1 Token</span>
        </div>
        <p className="text-[10px] mt-2.5 leading-relaxed text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
          Note: The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players!
        </p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : scores.length === 0 ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm tracking-wide">Awaiting first contestant. Enter the grid!</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950/20">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            return (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-cyan-500/5 ${i < 3 && !isChamp ? "bg-cyan-50/30 dark:bg-cyan-500/[0.02]" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {i < 3
                    ? <span className="text-xl">{medals[i]}</span>
                    : <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">#{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </span>
                  {isChamp && <span className="text-base flex-shrink-0" title="Defending Champ — Prize Cooldown">👑</span>}
                </div>
                <span className="text-sm font-black text-cyan-600 dark:text-cyan-400 tracking-wider tabular-nums flex-shrink-0 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-lg border border-cyan-100 dark:border-cyan-500/10">{s.score} pts</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────────
export default function FlappyTokenGame({ user, onUserUpdate }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const tokenImgRef = useRef(null);
  const idlePipesRef = useRef([
    { x: W * 0.65, gapY: 120 },
    { x: W * 1.1, gapY: 200 },
  ]);

  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [gameEnabled, setGameEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState("medium");

  // Preload token image
  useEffect(() => {
    const img = new Image();
    img.src = TOKEN_IMG_URL;
    tokenImgRef.current = img;
  }, []);

  // Load settings + user personal best
  useEffect(() => {
    base44.entities.AppSettings.list().then(rows => {
      const s = rows[0];
      if (s) {
        setGameEnabled(s.flappy_enabled !== false);
        setDifficulty(s.flappy_difficulty || "medium");
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.FlappyLeaderboard.filter({ user_id: user.id }).then(rows => {
      setLeaderboardEntry(rows[0] || null);
      setLoadingEntry(false);
    });
  }, [user?.id]);

  useEffect(() => {
    if (phase !== "idle") return;
    let animFrame;
    let running = true;

    const loop = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas || canvas.offsetWidth === 0) {
        animFrame = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      idlePipesRef.current.forEach(p => { p.x -= 0.8; if (p.x < -PIPE_W) p.x = W + PIPE_W; });
      drawIdleScreen(ctx, idlePipesRef.current, tokenImgRef.current);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animFrame); };
  }, [phase]);

  const saveScore = useCallback(async (s) => {
    if (!user?.id) return;
    setSaving(true);
    const currentBest = leaderboardEntry?.score ?? 0;
    const newBest = s > currentBest;
    if (newBest) {
      const payload = {
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Player",
        score: s,
        updated_at: new Date().toISOString(),
      };
      let updated;
      if (leaderboardEntry?.id) {
        updated = await base44.entities.FlappyLeaderboard.update(leaderboardEntry.id, payload);
      } else {
        updated = await base44.entities.FlappyLeaderboard.create(payload);
      }
      setLeaderboardEntry(updated);
    }
    setIsNewBest(newBest);
    setSaving(false);
  }, [user?.id, leaderboardEntry]);

  const getDiff = () => DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;

  // Optimized state tracking for Delta-Time mechanics
  const initState = () => ({
    birdY: H / 2, birdVel: 0, pipes: [], lastPipeTime: 0, lastTime: null, score: 0, dead: false,
  });

  const jump = useCallback((e) => {
    if (e) e.preventDefault(); // Prevents PC double-click scaling issues

    if (phase === "idle") {
      audio.startBg();
      const s = initState();
      s.lastTime = performance.now();
      s.lastPipeTime = performance.now();
      s.birdVel = getDiff().jumpVel;
      stateRef.current = s;
      setPhase("playing");
      setScore(0);
      setIsNewBest(false);
      audio.jump();
      return;
    }
    if (stateRef.current && !stateRef.current.dead) {
      stateRef.current.birdVel = getDiff().jumpVel;
      audio.jump();
    }
  }, [phase, difficulty]);

  const handleKey = useCallback((e) => {
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(e); }
  }, [jump]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Delta-Time Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = (timestamp) => {
      const s = stateRef.current;
      if (!s || s.dead) return;

      if (s.lastTime === null) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.03); // Cap frame delta to protect PC users
      s.lastTime = timestamp;

      const diff = getDiff();
      s.birdVel += diff.gravity * dt;
      s.birdY += s.birdVel * dt;

      if (s.lastPipeTime === 0) s.lastPipeTime = timestamp;
      if (timestamp - s.lastPipeTime >= diff.pipeIntervalMs) {
        const gapY = 70 + Math.random() * (H - diff.pipeGap - 130);
        s.pipes.push({ x: W + PIPE_W, gapY, scored: false });
        s.lastPipeTime = timestamp;
      }

      s.pipes.forEach(p => { p.x -= diff.pipeSpeed * dt; });
      s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

      s.pipes.forEach(p => {
        if (!p.scored && p.x + PIPE_W < BIRD_X) {
          p.scored = true; s.score++;
          setScore(s.score);
          audio.score();
        }
      });

      // Collision
      if (s.birdY - BIRD_R < 0 || s.birdY + BIRD_R > H) s.dead = true;
      s.pipes.forEach(p => {
        const inX = BIRD_X + BIRD_R - 4 > p.x && BIRD_X - BIRD_R + 4 < p.x + PIPE_W;
        const inTop = s.birdY - BIRD_R + 4 < p.gapY;
        const inBot = s.birdY + BIRD_R - 4 > p.gapY + diff.pipeGap;
        if (inX && (inTop || inBot)) s.dead = true;
      });

      drawBackground(ctx);
      s.pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + diff.pipeGap));
      drawBird(ctx, s.birdY, s.birdVel, tokenImgRef.current);

      // Score HUD
      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = "#ff00c8";
      ctx.fillStyle = "#ff00c8"; ctx.font = "bold 36px monospace";
      ctx.textAlign = "center"; ctx.fillText(s.score, W / 2, 52);
      ctx.restore();

      if (s.dead) {
        audio.stopBg(); audio.die();
        const fs = s.score;
        setFinalScore(fs);
        setPhase("dead");
        saveScore(fs);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, saveScore, difficulty]);

  const handlePlayAgain = () => {
    setPhase("idle");
  };

  if (loadingEntry) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!gameEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-5xl">👀</span>
        <p className="font-black text-lg text-foreground">Coming Soon</p>
        <p className="text-sm text-muted-foreground">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-4">
      {/* Canvas */}
      <div className="relative w-full" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onClick={jump}
          className="rounded-2xl border-2 cursor-pointer w-full select-none"
          style={{ display: "block", touchAction: "none", borderColor: "#1a0050", background: "#06001a" }}
          onTouchStart={jump}
        />

        {/* Difficulty badge — admin only */}
        {phase === "idle" && user?.role === "admin" && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
              difficulty === "easy" ? "bg-emerald-900/80 border-emerald-400 text-emerald-300" :
              difficulty === "hard" ? "bg-red-900/80 border-red-400 text-red-300" :
              "bg-yellow-900/80 border-yellow-400 text-yellow-300"
            }`}>{difficulty}</span>
          </div>
        )}

        {/* GAME OVER overlay */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl gap-3"
               style={{ background: "rgba(6,0,26,0.88)", backdropFilter: "blur(4px)" }}>
            <p className="font-black text-lg tracking-[0.25em] uppercase"
               style={{ color: "#ff00c8", textShadow: "0 0 18px #ff00c8" }}>Game Over</p>

            <div className="rounded-2xl px-8 py-4 flex flex-col items-center gap-1"
                 style={{ background: "#1a0050", border: "1px solid #ff00c8" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ff00c8" }}>Score</p>
              <p className="font-black text-5xl tabular-nums"
                 style={{ color: "#ffd700", textShadow: "0 0 20px #ffd700" }}>{finalScore}</p>
              {isNewBest && (
                <p className="text-xs font-bold" style={{ color: "#ffd700" }}>⚡ NEW SESSION BEST! ⚡</p>
              )}
              {saving
                ? <p className="text-[10px]" style={{ color: "#00e5ff" }}>Saving to leaderboard…</p>
                : <p className="text-[10px]" style={{ color: "#00e5ff" }}>Score saved to leaderboard</p>
              }
            </div>

            <div className="flex gap-3 mt-1">
              <button onClick={handlePlayAgain}
                className="px-5 py-2 rounded-xl font-black text-sm"
                style={{ background: "#00e5ff", color: "#06001a", boxShadow: "0 0 16px #00e5ff" }}>
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Leaderboard */}
      <div className="w-full" style={{ maxWidth: W }}>
        <LiveLeaderboard currentUserId={user?.id} />
      </div>
    </div>
  );
}