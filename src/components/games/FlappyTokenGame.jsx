import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy } from "lucide-react";

const W = 360;
const H = 500;
const BIRD_X = 70;
const BIRD_R = 16;
const PIPE_W = 54;

const DIFFICULTY_SETTINGS = {
  easy:   { gravity: 850,  jumpVel: -280, pipeGap: 170, pipeSpeed: 114, pipeIntervalMs: 1750 },
  medium: { gravity: 1050, jumpVel: -310, pipeGap: 145, pipeSpeed: 144, pipeIntervalMs: 1500 },
  hard:   { gravity: 1300, jumpVel: -350, pipeGap: 115, pipeSpeed: 220, pipeIntervalMs: 1050 },
};

const TOKEN_IMG_URL = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";
const BRAND_WORDS = ["EASI", "MOBI", "FREEDOM", "INFINITY"];

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

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#4BA3E3");
  bg.addColorStop(0.5, "#87CEEB");
  bg.addColorStop(1, "#E0F6FF");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.15, 35, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFDE7";
  ctx.shadowBlur = 60;
  ctx.shadowColor = "#FFD700";
  ctx.fill();
  ctx.restore();

  const drawCloud = (cx, cy, scale, opacity) => {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, 25 * scale, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(cx + 25 * scale, cy - 20 * scale, 30 * scale, Math.PI * 1, Math.PI * 2);
    ctx.arc(cx + 60 * scale, cy - 10 * scale, 25 * scale, Math.PI * 1.2, Math.PI * 2);
    ctx.arc(cx + 70 * scale, cy, 20 * scale, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawCloud(20, 120, 0.8, 0.9);
  drawCloud(220, 80, 1.2, 0.8);
  drawCloud(150, 300, 1.1, 0.85);
  drawCloud(-20, 420, 1.4, 0.7);

  // ── DST Corporate Watermark ──
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "900 72px sans-serif";
  ctx.fillText("DST", W / 4, H / 4);
  ctx.font = "800 24px sans-serif";
  ctx.fillText("☎ 16888", W / 2, H / 2 + 40);
  ctx.restore();
}

function drawPipe(ctx, x, topH, botY) {
  ctx.save();

  const casingGrad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  casingGrad.addColorStop(0, "#1a1a24");
  casingGrad.addColorStop(0.5, "#3d3d4e");
  casingGrad.addColorStop(1, "#1a1a24");

  const plasmaCore = ctx.createLinearGradient(x + 15, 0, x + PIPE_W - 15, 0);
  plasmaCore.addColorStop(0, "rgba(200, 100, 255, 0)");
  plasmaCore.addColorStop(0.5, "rgba(200, 100, 255, 0.8)");
  plasmaCore.addColorStop(1, "rgba(200, 100, 255, 0)");

  const brandWord = BRAND_WORDS[Math.floor(topH) % 4];

  const drawConduit = (y, h, isTop) => {
    ctx.fillStyle = casingGrad;
    ctx.fillRect(x, y, PIPE_W, h);

    ctx.fillStyle = plasmaCore;
    ctx.fillRect(x + 15, y, PIPE_W - 30, h);

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let i = 15; i < h - 15; i += 25) {
      ctx.fillRect(x, y + i, PIPE_W, 3);
    }

    // ── DST Branded pipe text ──
    ctx.save();
    ctx.translate(x + PIPE_W / 2, y + h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(brandWord, 0, 0);
    ctx.restore();

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#c864ff";
    ctx.fillStyle = "#2c2c3a";
    if (isTop) {
      ctx.fillRect(x - 4, y + h - 12, PIPE_W + 8, 12);
      ctx.fillStyle = "#c864ff";
      ctx.fillRect(x + 2, y + h - 10, PIPE_W - 4, 2);
    } else {
      ctx.fillRect(x - 4, y, PIPE_W + 8, 12);
      ctx.fillStyle = "#c864ff";
      ctx.fillRect(x + 2, y + 2, PIPE_W - 4, 2);
    }
  };

  drawConduit(0, topH, true);
  drawConduit(botY, H - botY, false);

  ctx.restore();
}

function drawBird(ctx, y, vel, tokenImg) {
  const tilt = Math.min(Math.max(vel * 0.15, -25), 70);
  ctx.save();
  ctx.translate(BIRD_X, y); ctx.rotate((tilt * Math.PI) / 180);
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#ffd700";
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
  pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + DIFFICULTY_SETTINGS.medium.pipeGap));
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
    <div className="w-full bg-[#0a0530]/90 backdrop-blur-xl rounded-2xl border border-[#c864ff]/30 shadow-[0_0_25px_rgba(200,100,255,0.15)] overflow-hidden transition-all duration-300">
      <div className="bg-gradient-to-b from-[#06001a] to-transparent border-b border-[#ff00c8]/20 px-5 py-5 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#c864ff] to-transparent opacity-60"></div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse" />
          <p className="text-sm font-black uppercase tracking-widest text-[#c864ff] drop-shadow-[0_0_5px_rgba(200,100,255,0.8)]">Live Grid Scores</p>
        </div>
        <p className="text-[11px] text-[#c864ff]/70 text-center leading-relaxed">
          The grid resets twice a month (15th & Final Day). Claim the Top 3 to extract tokens:
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-3">
          <span className="text-[11px] font-black bg-[#ffd700]/10 px-3 py-1 rounded-md border border-[#ffd700]/40 text-[#ffd700]">🥇 1ST: 5 TOKENS</span>
          <span className="text-[11px] font-black bg-[#c0c0c0]/10 px-3 py-1 rounded-md border border-[#c0c0c0]/40 text-[#c0c0c0]">🥈 2ND: 2 TOKENS</span>
          <span className="text-[11px] font-black bg-[#cd7f32]/10 px-3 py-1 rounded-md border border-[#cd7f32]/40 text-[#cd7f32]">🥉 3RD: 1 TOKEN</span>
        </div>
        <p className="text-[10px] mt-4 leading-relaxed text-[#ff00c8] flex items-center justify-center gap-1.5 font-bold">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff00c8] animate-ping" />
          Defending Champs (👑) enter a 1-season prize cooldown!
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#c864ff]" /></div>
      ) : scores.length === 0 ? (
        <div className="py-12 text-center text-[#c864ff]/50 text-sm tracking-widest font-bold uppercase">Awaiting first runner. Enter the grid!</div>
      ) : (
        <div className="divide-y divide-[#c864ff]/10 bg-transparent">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            const isTop3 = i < 3 && !isChamp;
            return (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#c864ff]/5 ${isTop3 ? "bg-[#c864ff]/[0.03]" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {i < 3
                    ? <span className="text-2xl drop-shadow-md">{medals[i]}</span>
                    : <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#06001a] text-[11px] font-black text-[#c864ff]/50 border border-[#c864ff]/20 shadow-inner">#{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`text-sm font-bold truncate ${isTop3 ? "text-white" : "text-white/70"}`} style={{ wordBreak: "break-word" }}>
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
  const [hasRetried, setHasRetried] = useState(false);
  const [processingRevive, setProcessingRevive] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = TOKEN_IMG_URL;
    tokenImgRef.current = img;
  }, []);

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

  // Idle animation loop
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

  const initState = () => ({
    birdY: H / 2, birdVel: 0, pipes: [], lastPipeTime: 0, lastTime: null, score: 0, dead: false,
  });

  const jump = useCallback((e) => {
    if (e) e.preventDefault();
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
      setHasRetried(false);
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

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = (timestamp) => {
      const s = stateRef.current;
      if (!s || s.dead) return;

      if (s.lastTime === null) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.03);
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

      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = "#ffffff";
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 46px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#1a1a24"; ctx.lineWidth = 4;
      ctx.strokeText(s.score, W / 2, 52);
      ctx.fillText(s.score, W / 2, 52);
      ctx.restore();

      if (s.dead) {
        audio.stopBg(); audio.die();
        const fs = s.score;
        setFinalScore(fs);
        setPhase("dead");
        saveScore(fs); // ✅ Auto-save immediately on death
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, saveScore, difficulty]);

  // Save & Restart — no duplicate save needed, already saved on death
  const handleSaveAndRestart = () => {
    setPhase("idle");
  };

  const handleContinue = async () => {
    if ((user?.earlyAccessTokens || 0) < 3 || processingRevive) return;
    setProcessingRevive(true);
    try {
      await base44.auth.updateMe({ earlyAccessTokens: user.earlyAccessTokens - 3 });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
        amount: -3,
        source: "Flappy Continue",
        timestamp: new Date().toISOString(),
      });
      await onUserUpdate();
      setHasRetried(true);
      const s = stateRef.current;
      s.dead = false;
      s.birdY = H / 2;
      s.birdVel = getDiff().jumpVel;
      s.pipes = [];
      s.lastTime = performance.now();
      s.lastPipeTime = performance.now();
      setPhase("playing");
      audio.startBg();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingRevive(false);
    }
  };

  if (loadingEntry) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#c864ff]" /></div>;
  }

  if (!gameEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#0a0530] rounded-2xl border border-[#ff00c8]/30">
        <span className="text-5xl">👀</span>
        <p className="font-black text-lg text-[#c864ff] tracking-widest uppercase">System Offline</p>
        <p className="text-sm text-white/50">Check back soon for the next run!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pb-6">
      {/* Canvas */}
      <div className="relative w-full shadow-[0_0_40px_rgba(135,206,235,0.3)] rounded-2xl" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onClick={jump}
          className="rounded-2xl border border-[#E0F6FF]/50 cursor-pointer w-full select-none"
          style={{ display: "block", touchAction: "none", background: "#87CEEB" }}
          onTouchStart={jump}
        />

        {/* Admin difficulty badge */}
        {phase === "idle" && user?.role === "admin" && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border shadow-lg ${
              difficulty === "easy" ? "bg-emerald-950/80 border-emerald-400 text-emerald-400" :
              difficulty === "hard" ? "bg-red-950/80 border-red-500 text-red-400" :
              "bg-[#ffd700]/10 border-[#ffd700]/50 text-[#ffd700]"
            }`}>MOD: {difficulty}</span>
          </div>
        )}

        {/* Idle overlay */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl pointer-events-none bg-[#000000]/30 backdrop-blur-[2px]">
            <h1 className="font-black text-4xl text-center leading-none tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] to-[#e0e0e0] drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
              TAP TO<br/>PLAY
            </h1>
            <div className="bg-[#000000]/40 border border-[#ffffff]/30 px-4 py-1.5 rounded-full backdrop-blur-md">
              <p className="text-[#ffffff] font-bold tracking-[0.2em] text-xs drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">
                CLICK • TAP • SPACE
              </p>
            </div>
            <div className="absolute bottom-4 flex flex-col items-center gap-0.5">
              <p className="text-[11px] font-bold text-white/80 tracking-wide">Powered by DST | ☎ 16888</p>
              <p className="text-[9px] text-white/50 tracking-widest">Easi • Mobi • Freedom • Infinity</p>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl gap-2 bg-[#000000]/70 backdrop-blur-md border border-[#c864ff]/40">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-[#ffffff] drop-shadow-[0_0_15px_rgba(200,100,255,1)] text-center mt-4">
              Run<br/>Ended
            </p>

            <div className="rounded-xl px-12 py-5 flex flex-col items-center gap-1 bg-[#1a1a24]/90 border border-[#c864ff]/50 shadow-[0_0_30px_rgba(200,100,255,0.2)] backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c864ff] to-transparent"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#c864ff]/80">Score</p>
              <p className="font-black text-6xl tabular-nums text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">{finalScore}</p>
              {isNewBest && (
                <p className="text-xs font-bold text-[#ffd700] mt-1">⚡ NEW BEST! ⚡</p>
              )}
              {saving
                ? <p className="text-[10px] text-[#c864ff] mt-1 animate-pulse">Saving score...</p>
                : <p className="text-[10px] text-[#c864ff]/60 mt-1">Score saved ✓</p>
              }
            </div>

            <div className="flex flex-col gap-3 mt-2 w-full px-8 pb-4 z-10">
              {!hasRetried && (user?.earlyAccessTokens >= 3) ? (
                <button
                  onClick={handleContinue}
                  disabled={processingRevive}
                  className="w-full px-4 py-3 rounded-lg font-black text-sm tracking-widest bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.8)] transition-all flex items-center justify-center gap-2"
                >
                  {processingRevive ? <Loader2 className="w-4 h-4 animate-spin" /> : "CONTINUE — 3 TOKENS"}
                </button>
              ) : !hasRetried && (
                <p className="text-[10px] text-red-400 font-bold text-center uppercase tracking-widest bg-black/50 p-1.5 rounded-md">
                  Not enough tokens to continue
                </p>
              )}

              <button
                onClick={handleSaveAndRestart}
                className="w-full px-4 py-3 rounded-lg font-black text-sm tracking-widest bg-transparent border-2 border-[#ffffff] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#000000] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.8)]"
              >
                {saving ? "SAVING..." : "PLAY AGAIN"}
              </button>
            </div>
            <p className="text-[10px] text-white/40 font-semibold mb-1">Powered by DST | ☎ 16888</p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-full" style={{ maxWidth: W }}>
        <LiveLeaderboard currentUserId={user?.id} />
      </div>
    </div>
  );
}