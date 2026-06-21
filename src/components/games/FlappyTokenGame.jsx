import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const W = 360;
const H = 540;
const BIRD_X = 80;
const BIRD_R = 14;
const GRAVITY = 0.38;
const JUMP_FORCE = -6.2;
const PIPE_W = 52;
const PIPE_GAP = 145;
const PIPE_SPEED = 2.2;
const PIPE_INTERVAL = 90; // frames

function drawNeonRect(ctx, x, y, w, h, color, glowColor) {
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = glowColor || color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawBird(ctx, y, vel) {
  const tilt = Math.min(Math.max(vel * 3.5, -25), 70);
  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate((tilt * Math.PI) / 180);
  // Glow
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#00fff7";
  // Body
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fillStyle = "#00fff7";
  ctx.fill();
  // Inner
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R - 5, 0, Math.PI * 2);
  ctx.fillStyle = "#003a38";
  ctx.fill();
  // Eye
  ctx.beginPath();
  ctx.arc(5, -3, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#00fff7";
  ctx.fill();
  ctx.restore();
}

export default function FlappyTokenGame({ user, onUserUpdate }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | playing | dead
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(null);
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(true);

  // Load user's existing leaderboard entry
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.FlappyLeaderboard.filter({ user_id: user.id }).then(rows => {
      const entry = rows[0] || null;
      setLeaderboardEntry(entry);
      setBestScore(entry?.score ?? 0);
      setLoadingEntry(false);
    });
  }, [user?.id]);

  const saveScore = useCallback(async (finalScore) => {
    if (!user?.id) return;
    setSaving(true);
    const currentBest = leaderboardEntry?.score ?? 0;
    if (finalScore > currentBest) {
      const payload = {
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Player",
        score: finalScore,
        updated_at: new Date().toISOString(),
      };
      let updated;
      if (leaderboardEntry?.id) {
        updated = await base44.entities.FlappyLeaderboard.update(leaderboardEntry.id, payload);
      } else {
        updated = await base44.entities.FlappyLeaderboard.create(payload);
      }
      setLeaderboardEntry(updated);
      setBestScore(finalScore);
    }
    setSaving(false);
  }, [user?.id, leaderboardEntry]);

  const initState = () => ({
    birdY: H / 2,
    birdVel: 0,
    pipes: [],
    frameCount: 0,
    score: 0,
    dead: false,
  });

  const jump = useCallback(() => {
    if (phase === "idle") {
      stateRef.current = initState();
      setPhase("playing");
      setScore(0);
    }
    if (stateRef.current && !stateRef.current.dead) {
      stateRef.current.birdVel = JUMP_FORCE;
    }
  }, [phase]);

  const handleKey = useCallback((e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      jump();
    }
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

      // Spawn pipes
      if (s.frameCount % PIPE_INTERVAL === 0) {
        const gapY = 80 + Math.random() * (H - PIPE_GAP - 160);
        s.pipes.push({ x: W + PIPE_W, gapY, scored: false });
      }

      // Move pipes
      s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
      s.pipes = s.pipes.filter(p => p.x > -PIPE_W);

      // Score
      s.pipes.forEach(p => {
        if (!p.scored && p.x + PIPE_W < BIRD_X) {
          p.scored = true;
          s.score++;
          setScore(s.score);
        }
      });

      // Collision — ceiling & floor
      if (s.birdY - BIRD_R < 0 || s.birdY + BIRD_R > H) {
        s.dead = true;
      }

      // Collision — pipes
      s.pipes.forEach(p => {
        const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
        const inTopPipe = s.birdY - BIRD_R < p.gapY;
        const inBotPipe = s.birdY + BIRD_R > p.gapY + PIPE_GAP;
        if (inX && (inTopPipe || inBotPipe)) s.dead = true;
      });

      // ── Draw ──────────────────────────────────────────────────────────────
      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#050818");
      bg.addColorStop(1, "#0a0f2c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(0,255,247,0.05)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 36) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 36) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // Pipes
      s.pipes.forEach(p => {
        // Top pipe
        drawNeonRect(ctx, p.x, 0, PIPE_W, p.gapY, "#0d2f2e", "#00fff7");
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = "#00fff7";
        ctx.strokeStyle = "#00fff7"; ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, PIPE_W, p.gapY);
        // Cap
        ctx.fillStyle = "#00fff7"; ctx.shadowBlur = 20;
        ctx.fillRect(p.x - 4, p.gapY - 12, PIPE_W + 8, 12);
        ctx.restore();

        // Bottom pipe
        const botY = p.gapY + PIPE_GAP;
        drawNeonRect(ctx, p.x, botY, PIPE_W, H - botY, "#0d2f2e", "#00fff7");
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = "#00fff7";
        ctx.strokeStyle = "#00fff7"; ctx.lineWidth = 2;
        ctx.strokeRect(p.x, botY, PIPE_W, H - botY);
        // Cap
        ctx.fillStyle = "#00fff7"; ctx.shadowBlur = 20;
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 12);
        ctx.restore();
      });

      // Bird
      drawBird(ctx, s.birdY, s.birdVel);

      // Score overlay
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = "#00fff7";
      ctx.fillStyle = "#00fff7";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.score, W / 2, 48);
      ctx.restore();

      if (s.dead) {
        setPhase("dead");
        setScore(s.score);
        saveScore(s.score);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, saveScore]);

  // Draw idle screen
  useEffect(() => {
    if (phase !== "idle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#050818");
    bg.addColorStop(1, "#0a0f2c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.shadowBlur = 30; ctx.shadowColor = "#00fff7";
    ctx.fillStyle = "#00fff7";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FLAPPY TOKEN", W / 2, H / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,255,247,0.6)";
    ctx.font = "14px monospace";
    ctx.fillText("Tap or Press Space to Start", W / 2, H / 2);
    ctx.fillStyle = "rgba(0,255,247,0.35)";
    ctx.font = "12px monospace";
    ctx.fillText("🏆 Unlimited Practice — No Instant Rewards", W / 2, H / 2 + 28);
    ctx.restore();
  }, [phase]);

  const handleRestartOrStart = () => {
    if (phase === "dead") {
      setPhase("idle");
    } else {
      jump();
    }
  };

  if (loadingEntry) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Header */}
      <div className="w-full bg-[#050818] rounded-2xl border border-[#00fff7]/30 p-3 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#00fff7]/60">Flappy Token</p>
          <p className="text-xs text-[#00fff7]/40 mt-0.5">🏆 Seasonal Competition — No Instant Rewards</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#00fff7]/60">Personal Best</p>
          <p className="text-lg font-black text-[#00fff7]">{bestScore ?? 0}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleRestartOrStart}
          className="rounded-2xl border border-[#00fff7]/30 cursor-pointer"
          style={{ display: "block", touchAction: "none" }}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
        />

        {/* Dead overlay */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm gap-4">
            <p className="text-[#00fff7] font-black text-3xl" style={{ textShadow: "0 0 20px #00fff7" }}>
              GAME OVER
            </p>
            <p className="text-white text-lg font-bold">Score: {score}</p>
            {score > (leaderboardEntry?.score ?? 0) - 1 && score === bestScore && score > 0 && (
              <p className="text-amber-400 text-sm font-bold">🎉 New Personal Best!</p>
            )}
            {saving ? (
              <div className="flex items-center gap-2 text-[#00fff7]/60 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving score…
              </div>
            ) : null}
            <button
              onClick={handleRestartOrStart}
              className="mt-2 px-6 py-2.5 rounded-xl font-black text-sm text-black"
              style={{ background: "#00fff7", boxShadow: "0 0 24px #00fff7" }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="w-full bg-[#050818] rounded-2xl border border-[#00fff7]/20 p-3 flex justify-around text-center">
        <div>
          <p className="text-[10px] text-[#00fff7]/50 uppercase font-bold tracking-wider">🥇 1st Place</p>
          <p className="text-xs text-[#00fff7] font-black mt-0.5">+5 tokens</p>
        </div>
        <div>
          <p className="text-[10px] text-[#00fff7]/50 uppercase font-bold tracking-wider">🥈 2nd Place</p>
          <p className="text-xs text-[#00fff7] font-black mt-0.5">+2 tokens</p>
        </div>
        <div>
          <p className="text-[10px] text-[#00fff7]/50 uppercase font-bold tracking-wider">🥉 3rd Place</p>
          <p className="text-xs text-[#00fff7] font-black mt-0.5">+1 token</p>
        </div>
      </div>
    </div>
  );
}