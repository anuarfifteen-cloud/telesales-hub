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

// MOCHI UPDATE: Removed the canvas text drawing here. We now handle it beautifully in the React DOM layer.
function drawIdleScreen(ctx, pipes, tokenImg) {
  drawBackground(ctx);
  // Draw two idle pipes for decoration
  pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + DIFFICULTY_SETTINGS.medium.pipeGap));
  // Draw coin
  drawBird(ctx, H / 2, 0, tokenImg);
}

// ── Live Leaderboard ──────────────────────────────────────────────────────────
function LiveLeaderboard({ currentUserId }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [champUserIds, setChampUserIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, settingsRows] = await Promise.all([
      base44.entities.FlappyLeaderboard.list("-score", 10),
      base44.entities.AppSettings.list(),
    ]);
    setScores(rows);
    setChampUserIds(new Set(settingsRows[0]?.defending_champ_flappy_ids || []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.FlappyLeaderboard.subscribe(() => load());
    return unsub;
  }, [load]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full bg-[#0a0530]/90 backdrop-blur-xl rounded-2xl border border-[#00e5ff]/30 shadow-[0_0_25px_rgba(0,229,255,0.15)] overflow-hidden transition-all duration-300">
      {/* Info box */}
      <div className="bg-gradient-to-b from-[#06001a] to-transparent border-b border-[#ff00c8]/20 px-5 py-5 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ff00c8] to-transparent opacity-60"></div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse" />
          <p className="text-sm font-black uppercase tracking-widest text-[#00e5ff] drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]">Live Cyber Grid</p>
        </div>
        <p className="text-[11px] text-[#00e5ff]/70 text-center leading-relaxed">
          The grid resets twice a month (15th & Final Day). Claim the Top 3 to extract tokens:
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-3">
          <span className="text-[11px] font-black bg-[#ffd700]/10 px-3 py-1 rounded-md border border-[#ffd700]/40 text-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.1)]">🥇 1ST: 5 TOKENS</span>
          <span className="text-[11px] font-black bg-[#c0c0c0]/10 px-3 py-1 rounded-md border border-[#c0c0c0]/40 text-[#c0c0c0] shadow-[0_0_10px_rgba(192,192,192,0.1)]">🥈 2ND: 2 TOKENS</span>
          <span className="text-[11px] font-black bg-[#cd7f32]/10 px-3 py-1 rounded-md border border-[#cd7f32]/40 text-[#cd7f32] shadow-[0_0_10px_rgba(205,127,50,0.1)]">🥉 3RD: 1 TOKEN</span>
        </div>
        <p className="text-[10px] mt-4 leading-relaxed text-[#ff00c8] flex items-center justify-center gap-1.5 font-bold">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff00c8] animate-ping" />
          Defending Champs (👑) enter a 1-season prize cooldown!
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#00e5ff]" /></div>
      ) : scores.length === 0 ? (
        <div className="py-12 text-center text-[#00e5ff]/50 text-sm tracking-widest font-bold uppercase">Awaiting first runner. Enter the grid!</div>
      ) : (
        <div className="divide-y divide-[#00e5ff]/10 bg-transparent">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            const isTop3 = i < 3 && !isChamp;
            return (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#00e5ff]/5 ${isTop3 ? "bg-[#00e5ff]/[0.03]" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {i < 3
                    ? <span className="text-2xl drop-shadow-md">{medals[i]}</span>
                    : <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#06001a] text-[11px] font-black text-[#00e5ff]/50 border border-[#00e5ff]/20 shadow-inner">#{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`text-sm font-bold truncate ${isTop3 ? 'text-white' : 'text-white/70'}`} style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </span>
                  {isChamp && <span className="text-base flex-shrink-0 drop-shadow-[0_0_5px_#ffd700]" title="Defending Champ — Prize Cooldown">👑</span>}
                </div>
                <span className="text-sm font-black text-[#ff00c8] tracking-widest tabular-nums flex-shrink-0 bg-[#ff00c8]/10 px-3 py-1.5 rounded-lg border border-[#ff00c8]/30 shadow-[0_0_10px_rgba(255,0,200,0.2)]">
                  {s.score} PTS
                </span>
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
      ctx.fillStyle = "#ff00c8"; ctx.font = "bold 42px monospace";
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
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00e5ff]" /></div>;
  }

  if (!gameEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#0a0530] rounded-2xl border border-[#ff00c8]/30">
        <span className="text-5xl">👀</span>
        <p className="font-black text-lg text-[#00e5ff] tracking-widest uppercase">System Offline</p>
        <p className="text-sm text-white/50">Check back soon for the next run!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pb-6">
      {/* Canvas Container */}
      <div className="relative w-full shadow-[0_0_40px_rgba(0,229,255,0.15)] rounded-2xl" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onClick={jump}
          className="rounded-2xl border border-[#00e5ff]/50 cursor-pointer w-full select-none"
          style={{ display: "block", touchAction: "none", background: "#06001a" }}
          onTouchStart={jump}
        />

        {/* Difficulty badge — admin only */}
        {phase === "idle" && user?.role === "admin" && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border shadow-lg ${
              difficulty === "easy" ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-emerald-500/20" :
              difficulty === "hard" ? "bg-red-950/80 border-red-500 text-red-400 shadow-red-500/20" :
              "bg-[#ffd700]/10 border-[#ffd700]/50 text-[#ffd700] shadow-[#ffd700]/20"
            }`}>MOD: {difficulty}</span>
          </div>
        )}

        {/* HTML OVERLAY: IDLE SCREEN (MOCHI Upgrade) */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl pointer-events-none bg-[#06001a]/40 backdrop-blur-[2px]">
            <h1 className="font-black text-4xl text-center leading-none tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#ff00c8] to-[#990078] drop-shadow-[0_0_15px_rgba(255,0,200,0.8)]">
              TAP TO<br/>PLAY
            </h1>
            <div className="bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-4 py-1.5 rounded-full backdrop-blur-md">
              <p className="text-[#00e5ff] font-bold tracking-[0.2em] text-xs drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]">
                CLICK • TAP • SPACE
              </p>
            </div>
          </div>
        )}

        {/* HTML OVERLAY: GAME OVER (MOCHI Upgrade) */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl gap-5 bg-[#06001a]/85 backdrop-blur-md border border-[#ff00c8]/40">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-[#ff00c8] drop-shadow-[0_0_15px_rgba(255,0,200,1)] text-center">
              Connection<br/>Lost
            </p>

            <div className="rounded-xl px-12 py-5 flex flex-col items-center gap-1 bg-[#1a0050]/80 border border-[#00e5ff]/50 shadow-[0_0_30px_rgba(0,229,255,0.2)] backdrop-blur-sm relative overflow-hidden">
              {/* Decorative top border glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
              
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00e5ff]/80">Final Score</p>
              <p className="font-black text-6xl tabular-nums text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
                {finalScore}
              </p>
              
              {isNewBest && (
                <div className="mt-2 mb-1 bg-[#ff00c8]/20 px-4 py-1 rounded-md border border-[#ff00c8]/50 shadow-[0_0_10px_rgba(255,0,200,0.3)]">
                  <p className="text-[10px] font-black tracking-widest text-[#ff00c8] animate-pulse">⚡ NEW RECORD ⚡</p>
                </div>
              )}
              
              <div className="h-4 mt-2 flex items-center justify-center">
                  {saving ? (
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#00e5ff]/70 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#00e5ff] drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">
                      Grid Updated
                    </p>
                  )}
              </div>
            </div>

            <button onClick={handlePlayAgain}
              className="mt-2 px-8 py-3 rounded-lg font-black text-sm tracking-widest bg-transparent border-2 border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#06001a] transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.8)]">
              REBOOT SYSTEM
            </button>
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