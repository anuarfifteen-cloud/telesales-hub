import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Trophy } from "lucide-react";

const W = 360;
const H = 500;
const BIRD_X = 70;
const BIRD_R = 16;
const GRAVITY = 0.36;
const JUMP_FORCE = -6.2;
const PIPE_W = 54;
const PIPE_GAP = 175;
const PIPE_SPEED = 2.1;
const PIPE_INTERVAL = 95;

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
  const tilt = Math.min(Math.max(vel * 3.5, -25), 70);
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
  pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + PIPE_GAP));
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

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.FlappyLeaderboard.list("-score", 10);
    setScores(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.FlappyLeaderboard.subscribe(() => load());
    return unsub;
  }, [load]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full flex flex-col gap-0 rounded-2xl overflow-hidden border border-[#00e5ff]/30" style={{ background: "#0d0127" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00e5ff]/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-black text-sm uppercase tracking-wider">🏆 Live Cyber Leaderboard</span>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-[#00e5ff] text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 border-b border-[#00e5ff]/20 flex flex-col gap-2 items-center text-center" style={{ background: "#110035" }}>
        <p className="text-[11px] text-white/60 leading-relaxed">
          The leaderboard resets twice a month <span className="text-white/80">(on the 15th and the final day of the month)</span>. Be in the Top 3 when the season ends to win:
        </p>
        <div className="flex gap-2 flex-wrap">
          {[["🥇 1st", "5 Tokens", "#ffd700"], ["🥈 2nd", "2 Tokens", "#94a3b8"], ["🥉 3rd", "1 Token", "#c2692a"]].map(([rank, prize, color]) => (
            <div key={rank} className="flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold border" style={{ borderColor: color + "55", background: color + "18", color }}>
              {rank}: {prize}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">
          Note: The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players!
        </p>
      </div>

      {/* Column headers */}
      <div className="grid px-4 py-1.5 border-b border-[#00e5ff]/10" style={{ gridTemplateColumns: "48px 1fr 64px" }}>
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest">Rank</span>
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest">Player</span>
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest text-right">Score</span>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#00e5ff]/50" /></div>
      ) : scores.length === 0 ? (
        <div className="py-6 text-center text-[#00e5ff]/40 text-sm">No scores yet. Be the first!</div>
      ) : (
        <div className="divide-y divide-[#00e5ff]/10">
          {scores.map((s, i) => {
            const isMe = s.user_id === currentUserId;
            return (
              <div key={s.id} className="grid items-center px-4 py-2.5 transition-colors" style={{ gridTemplateColumns: "48px 1fr 64px", background: isMe ? "rgba(255,0,200,0.07)" : i < 3 ? "rgba(0,229,255,0.04)" : "transparent" }}>
                <div className="flex items-center">
                  {i < 3
                    ? <span className="text-xl">{medals[i]}</span>
                    : <span className="text-xs font-black" style={{ color: "#00e5ff66" }}>#{i + 1}</span>
                  }
                </div>
                <span className="text-xs font-semibold pr-2 leading-tight" style={{ color: isMe ? "#ff00c8" : "#e2e8f0", whiteSpace: "normal", wordBreak: "break-word" }}>
                  {s.user_name}
                </span>
                <span className="text-sm font-black text-right tabular-nums" style={{ color: i === 0 ? "#ffd700" : i === 1 ? "#94a3b8" : i === 2 ? "#c2692a" : "#00e5ff" }}>
                  {s.score}
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

  // Preload token image
  useEffect(() => {
    const img = new Image();
    img.src = TOKEN_IMG_URL;
    tokenImgRef.current = img;
  }, []);

  // Load user personal best
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.FlappyLeaderboard.filter({ user_id: user.id }).then(rows => {
      setLeaderboardEntry(rows[0] || null);
      setLoadingEntry(false);
    });
  }, [user?.id]);

  useEffect(() => {
  if (phase !== "idle") return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let animFrame;

  const startLoop = () => {
    cancelAnimationFrame(animFrame);
    const loop = () => {
      idlePipesRef.current.forEach(p => { p.x -= 0.8; if (p.x < -PIPE_W) p.x = W + PIPE_W; });
      drawIdleScreen(ctx, idlePipesRef.current, tokenImgRef.current);
      animFrame = requestAnimationFrame(loop);
    };
    drawIdleScreen(ctx, idlePipesRef.current, tokenImgRef.current);
    animFrame = requestAnimationFrame(loop);
  };

  // Delay first draw by 120ms to allow layout to complete
  const initTimer = setTimeout(() => startLoop(), 120);

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && entries[0].intersectionRatio > 0 && canvasRef.current) {
      startLoop();
    }
  }, { threshold: 0.1 });
  observer.observe(canvas);

  return () => {
    clearTimeout(initTimer);
    cancelAnimationFrame(animFrame);
    observer.disconnect();
  };
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

  const initState = () => ({
    birdY: H / 2, birdVel: 0, pipes: [], frameCount: 0, score: 0, dead: false,
  });

  const jump = useCallback(() => {
    if (phase === "idle") {
      audio.startBg();
      stateRef.current = initState();
      setPhase("playing");
      setScore(0);
      setIsNewBest(false);
    }
    if (stateRef.current && !stateRef.current.dead) {
      stateRef.current.birdVel = JUMP_FORCE;
      audio.jump();
    }
  }, [phase]);

  const handleKey = useCallback((e) => {
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
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

    const loop = () => {
      const s = stateRef.current;
      if (!s || s.dead) return;

      s.frameCount++;
      s.birdVel += GRAVITY;
      s.birdY += s.birdVel;

      if (s.frameCount % PIPE_INTERVAL === 0) {
        const gapY = 70 + Math.random() * (H - PIPE_GAP - 130);
        s.pipes.push({ x: W + PIPE_W, gapY, scored: false });
      }

      s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
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
        const inBot = s.birdY + BIRD_R - 4 > p.gapY + PIPE_GAP;
        if (inX && (inTop || inBot)) s.dead = true;
      });

      drawBackground(ctx);
      s.pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + PIPE_GAP));
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
  }, [phase, saveScore]);

  const handlePlayAgain = () => {
    setPhase("idle");
  };

  if (loadingEntry) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-4">
      {/* Canvas */}
      <div className="relative w-full" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onClick={jump}
          className="rounded-2xl border-2 cursor-pointer w-full"
          style={{ display: "block", touchAction: "none", borderColor: "#1a0050", background: "#06001a" }}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
        />

        {/* Score during play */}
        {phase === "playing" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
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