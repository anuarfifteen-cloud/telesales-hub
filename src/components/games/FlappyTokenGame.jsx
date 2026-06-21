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
const PIPE_GAP = 175; // wide easy mode gap
const PIPE_SPEED = 2.1;
const PIPE_INTERVAL = 95;

const TOKEN_IMG_URL = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";

// ── Star field ───────────────────────────────────────────────────────────────
function makeStars(n = 80) {
  return Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.5 + Math.random() * 1.5,
    a: 0.3 + Math.random() * 0.7,
  }));
}
const STARS = makeStars();

// ── Draw helpers ─────────────────────────────────────────────────────────────
function drawPipe(ctx, x, topH, botY) {
  // shadow glow
  ctx.save();
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#00e5ff";

  // top pipe body
  const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  grad.addColorStop(0, "#006070");
  grad.addColorStop(0.4, "#00d4f5");
  grad.addColorStop(1, "#004f5c");
  ctx.fillStyle = grad;
  ctx.fillRect(x, 0, PIPE_W, topH);

  // top cap
  ctx.fillStyle = "#00e5ff";
  ctx.fillRect(x - 5, topH - 14, PIPE_W + 10, 14);

  // bottom pipe body
  ctx.fillStyle = grad;
  ctx.fillRect(x, botY, PIPE_W, H - botY);

  // bottom cap
  ctx.fillStyle = "#00e5ff";
  ctx.fillRect(x - 5, botY, PIPE_W + 10, 14);

  ctx.restore();
}

function drawBird(ctx, y, vel, tokenImg) {
  const tilt = Math.min(Math.max(vel * 3.5, -25), 70);
  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate((tilt * Math.PI) / 180);
  if (tokenImg?.complete && tokenImg.naturalWidth > 0) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffd700";
    ctx.drawImage(tokenImg, -BIRD_R - 2, -BIRD_R - 2, (BIRD_R + 2) * 2, (BIRD_R + 2) * 2);
  } else {
    // fallback gold circle
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffd700";
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc107";
    ctx.fill();
    ctx.fillStyle = "#e65100";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
  }
  ctx.restore();
}

function drawBackground(ctx) {
  // deep space gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#06001a");
  bg.addColorStop(1, "#0a0530");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // stars
  STARS.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Leaderboard component ─────────────────────────────────────────────────────
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

  // realtime subscribe
  useEffect(() => {
    const unsub = base44.entities.FlappyLeaderboard.subscribe(() => load());
    return unsub;
  }, [load]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#00e5ff]/30" style={{ background: "#0d0127" }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#00e5ff]/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-black text-sm uppercase tracking-wider">Top 10</span>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-[#00e5ff] text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* column labels */}
      <div className="grid grid-cols-3 px-4 py-1.5 border-b border-[#00e5ff]/10">
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest">Rank</span>
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest">Player</span>
        <span className="text-[10px] font-bold text-[#00e5ff]/50 uppercase tracking-widest text-right">Score</span>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#00e5ff]/50" />
        </div>
      ) : scores.length === 0 ? (
        <div className="py-6 text-center text-[#00e5ff]/40 text-sm">No scores yet. Be the first!</div>
      ) : (
        <div className="divide-y divide-[#00e5ff]/10">
          {scores.map((s, i) => {
            const isMe = s.user_id === currentUserId;
            return (
              <div
                key={s.id}
                className={`grid grid-cols-3 items-center px-4 py-2 transition-colors ${isMe ? "bg-[#ff00c8]/10" : i < 3 ? "bg-[#00e5ff]/5" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  {i < 3
                    ? <span className="text-lg">{medals[i]}</span>
                    : <span className="text-xs font-black text-[#00e5ff]/40">#{i + 1}</span>
                  }
                </div>
                <span className={`text-xs font-semibold truncate ${isMe ? "text-[#ff00c8]" : "text-white/80"}`}>
                  {isMe ? "⭐ " : ""}{s.user_name}
                </span>
                <span className={`text-sm font-black text-right tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-[#00e5ff]"}`}>
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

  const [phase, setPhase] = useState("idle"); // idle | playing | dead
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(true);

  // preload token image
  useEffect(() => {
    const img = new Image();
    img.src = TOKEN_IMG_URL;
    tokenImgRef.current = img;
  }, []);

  // load user's personal best
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.FlappyLeaderboard.filter({ user_id: user.id }).then(rows => {
      const entry = rows[0] || null;
      setLeaderboardEntry(entry);
      setBestScore(entry?.score ?? 0);
      setLoadingEntry(false);
    });
  }, [user?.id]);

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
      setBestScore(s);
    }
    setIsNewBest(newBest);
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
      setIsNewBest(false);
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

  // Draw idle screen
  useEffect(() => {
    if (phase !== "idle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawBackground(ctx);

    // Title
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff00c8";
    ctx.fillStyle = "#ff00c8";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FLAPPY TOKEN", W / 2, H / 2 - 70);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "13px monospace";
    ctx.fillText("Tap or Press Space to Start", W / 2, H / 2 - 30);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px monospace";
    ctx.fillText("🏆 Seasonal Leaderboard — No Instant Rewards", W / 2, H / 2);
    ctx.restore();

    // Draw coin in idle
    if (tokenImgRef.current?.complete && tokenImgRef.current.naturalWidth > 0) {
      ctx.save();
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#ffd700";
      ctx.drawImage(tokenImgRef.current, W / 2 - 24, H / 2 + 24, 48, 48);
      ctx.restore();
    }
  }, [phase]);

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
        const gapY = 70 + Math.random() * (H - PIPE_GAP - 130);
        s.pipes.push({ x: W + PIPE_W, gapY, scored: false });
      }

      s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
      s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

      // Score
      s.pipes.forEach(p => {
        if (!p.scored && p.x + PIPE_W < BIRD_X) {
          p.scored = true;
          s.score++;
          setScore(s.score);
        }
      });

      // Collision
      if (s.birdY - BIRD_R < 0 || s.birdY + BIRD_R > H) {
        s.dead = true;
      }
      s.pipes.forEach(p => {
        const inX = BIRD_X + BIRD_R - 4 > p.x && BIRD_X - BIRD_R + 4 < p.x + PIPE_W;
        const inTopPipe = s.birdY - BIRD_R + 4 < p.gapY;
        const inBotPipe = s.birdY + BIRD_R - 4 > p.gapY + PIPE_GAP;
        if (inX && (inTopPipe || inBotPipe)) s.dead = true;
      });

      // ── Render ──
      drawBackground(ctx);
      s.pipes.forEach(p => drawPipe(ctx, p.x, p.gapY, p.gapY + PIPE_GAP));
      drawBird(ctx, s.birdY, s.birdVel, tokenImgRef.current);

      // Score HUD
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff00c8";
      ctx.fillStyle = "#ff00c8";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.score, W / 2, 52);
      ctx.restore();

      if (s.dead) {
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
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-4">

      {/* Canvas */}
      <div
        className="relative w-full"
        style={{ maxWidth: W }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          className="rounded-2xl border-2 cursor-pointer w-full"
          style={{ display: "block", touchAction: "none", borderColor: "#1a0050", background: "#06001a" }}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
        />

        {/* GAME OVER overlay */}
        {phase === "dead" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl gap-3"
            style={{ background: "rgba(6,0,26,0.85)", backdropFilter: "blur(4px)" }}
          >
            <p className="font-black text-lg tracking-[0.25em] uppercase"
               style={{ color: "#ff00c8", textShadow: "0 0 18px #ff00c8" }}>
              Game Over
            </p>

            {/* Score box */}
            <div className="rounded-2xl px-8 py-4 flex flex-col items-center gap-1"
                 style={{ background: "#1a0050", border: "1px solid #ff00c8" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest"
                 style={{ color: "#ff00c8" }}>Score</p>
              <p className="font-black text-5xl tabular-nums"
                 style={{ color: "#ffd700", textShadow: "0 0 20px #ffd700" }}>
                {finalScore}
              </p>
              {isNewBest && (
                <p className="text-xs font-bold"
                   style={{ color: "#ffd700" }}>
                  ⚡ NEW SESSION BEST! ⚡
                </p>
              )}
              {saving
                ? <p className="text-[10px]" style={{ color: "#00e5ff" }}>Saving to leaderboard…</p>
                : <p className="text-[10px]" style={{ color: "#00e5ff" }}>Score saved to leaderboard</p>
              }
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={handlePlayAgain}
                className="px-5 py-2 rounded-xl font-black text-sm"
                style={{ background: "#00e5ff", color: "#06001a", boxShadow: "0 0 16px #00e5ff" }}
              >
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