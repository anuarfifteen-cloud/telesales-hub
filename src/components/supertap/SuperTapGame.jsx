import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Medal } from "lucide-react";
import { toast } from "sonner";

// ── Sound Engine (Web Audio API) ──────────────────────────────────────────────
function createAudioCtx() {
  try {return new (window.AudioContext || window.webkitAudioContext)();} catch {return null;}
}

function playTapSound(ctx) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.09);
}

function playStartSound(ctx) {
  if (!ctx) return;
  [440, 550, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.1);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.12);
  });
}

function playEndSound(ctx) {
  if (!ctx) return;
  [660, 440, 330].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.18);
  });
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-black text-slate-600 dark:text-slate-300">
      {rank}
    </span>);

}

function Leaderboard() {
  const { data: scores = [] } = useQuery({
    queryKey: ["tapScores"],
    queryFn: () => base44.entities.TapScore.list("-high_score", 10),
    refetchInterval: 10000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["tapUsersPublic"],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 60000
  });

  const champUserIds = new Set(allUsers.filter((u) => u.is_defending_champ).map((u) => u.id));

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Info box */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">🏆 Live Leaderboard</p>
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          The leaderboard resets twice a month (on the 15th and the final day of the month). Be in the Top 3 when the season ends to win:
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">🥇 1st: 5 Tokens</span>
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">🥈 2nd: 2 Tokens</span>
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">🥉 3rd: 1 Token</span>
        </div>
        <p className="text-[11px] text-amber-700 light:text-amber-400 mt-2 leading-relaxed">Note: The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players on the board!

        </p>
      </div>

      {scores.length === 0 ?
      <div className="py-8 text-center text-muted-foreground text-sm">No scores yet. Be the first!</div> :

      <div className="divide-y divide-border">
          {scores.map((s, i) => {
          const isChamp = champUserIds.has(s.user_id);
          return (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 && !isChamp ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={i + 1} />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground" style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </span>
                  {isChamp && <span className="text-base flex-shrink-0" title="Defending Champ — Prize Cooldown">👑</span>}
                </div>
                <span className="text-sm font-black text-primary tabular-nums flex-shrink-0">{s.high_score} taps</span>
              </div>);

        })}
        </div>
      }
    </div>);

}

export default function SuperTapGame({ user }) {
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [currentScore, setCurrentScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [tapped, setTapped] = useState(false); // flash effect
  const [ripples, setRipples] = useState([]);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rippleIdRef = useRef(0);
  const queryClient = useQueryClient();

  // Lazy-init audio ctx on first user gesture
  const getAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const saveScore = async (score) => {
    if (!user) return;
    setSaving(true);
    try {
      const existing = await base44.entities.TapScore.filter({ user_id: user.id });
      if (existing.length === 0) {
        await base44.entities.TapScore.create({
          user_id: user.id,
          user_name: user.full_name || user.email,
          user_email: user.email,
          high_score: score,
          last_played: new Date().toISOString()
        });
        setNewRecord(true);
      } else {
        const record = existing[0];
        if (score > record.high_score) {
          await base44.entities.TapScore.update(record.id, {
            high_score: score,
            last_played: new Date().toISOString()
          });
          setNewRecord(true);
        } else {
          setNewRecord(false);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tapScores"] });
    } finally {
      setSaving(false);
    }
  };

  const addRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    const id = ++rippleIdRef.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 500);
  };

  const startGame = () => {
    if (isPlaying) return;
    getAudio();
    playStartSound(audioCtxRef.current);
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    setIsPlaying(true);
    setIsOver(false);
    setNewRecord(false);
    setCurrentScore(0);
    let remaining = 100;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(parseFloat((remaining / 10).toFixed(1)));
      if (remaining <= 0) {
        clearTimer();
        setIsPlaying(false);
        setIsOver(true);
        playEndSound(audioCtxRef.current);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        setCurrentScore((prev) => {
          saveScore(prev);
          return prev;
        });
      }
    }, 100);
  };

  const handleTap = (e) => {
    if (isOver) return;
    if (!isPlaying) {startGame();return;}
    // Ripple
    addRipple(e);
    // Flash
    setTapped(true);
    setTimeout(() => setTapped(false), 80);
    // Vibrate
    if (navigator.vibrate) navigator.vibrate(12);
    // Sound
    playTapSound(audioCtxRef.current);
    setCurrentScore((s) => s + 1);
  };

  const handleReset = () => {
    clearTimer();
    setTimeLeft(10.0);
    setCurrentScore(0);
    setIsPlaying(false);
    setIsOver(false);
    setNewRecord(false);
    setSaving(false);
  };

  const displayTime = isOver ? "0.0" : timeLeft.toFixed(1);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-foreground">Super Tap ⚡</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Tap as fast as you can in 10 seconds!</p>
      </div>

      {/* HUD */}
      <div className="flex justify-center gap-10">
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Time</span>
          <span className={`text-5xl font-black tabular-nums ${parseFloat(displayTime) <= 3 && !isOver ? "text-red-500" : "text-foreground"}`}>
            {displayTime}s
          </span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Taps</span>
          <span
            key={currentScore}
            className="text-5xl font-black tabular-nums text-primary"
            style={{ animation: currentScore > 0 ? "tapPop 0.15s ease-out" : "none" }}>
            {currentScore}</span>
        </div>
      </div>

      {/* Result / Record banner */}
      {isOver &&
      <div className={`rounded-xl px-4 py-3 text-center ${newRecord ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700" : "bg-muted border border-border"}`}>
          {saving ?
        <p className="text-sm font-semibold text-muted-foreground">Saving score…</p> :
        newRecord ?
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">🎉 New personal best! {currentScore} taps!</p> :

        <p className="text-sm font-semibold text-muted-foreground">Score: {currentScore} taps. Keep practicing!</p>
        }
        </div>
      }

      {/* Tap Button */}
      <div className="flex justify-center">
        <button
          onPointerDown={handleTap}
          disabled={isOver}
          className={`relative overflow-hidden w-52 h-52 rounded-full text-white text-3xl font-extrabold shadow-2xl transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed
            ${tapped ?
          "scale-90 bg-gradient-to-b from-yellow-300 to-red-500 shadow-yellow-300/60" :
          "scale-100 bg-gradient-to-b from-red-400 to-red-600 active:scale-95 shadow-red-500/40"}`
          }
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            boxShadow: tapped ?
            "0 0 40px 12px rgba(250,200,0,0.45), 0 8px 32px rgba(0,0,0,0.3)" :
            "0 8px 32px rgba(220,38,38,0.4), inset 0 -6px 0 rgba(0,0,0,0.2)",
            transition: "transform 0.08s ease, box-shadow 0.08s ease, background 0.08s ease"
          }}>
          
          {/* Ripples */}
          {ripples.map((r) =>
          <span
            key={r.id}
            className="absolute rounded-full bg-white/30 animate-ping pointer-events-none"
            style={{
              width: 80, height: 80,
              left: r.x - 40, top: r.y - 40,
              animationDuration: "0.5s",
              animationIterationCount: 1
            }} />

          )}
          {/* Inner ring glow */}
          <span className="absolute inset-3 rounded-full border-4 border-white/20 pointer-events-none" />
          <span className="relative z-10 drop-shadow-lg">
            {isOver ? "⏱ Time's Up!" : isPlaying ? "TAP!" : "TAP\nto start!"}
          </span>
        </button>
      </div>

      {/* Play again */}
      {isOver && !saving &&
      <button
        onClick={handleReset}
        className="mx-auto flex items-center gap-2 bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
        
          Play Again 🔄
        </button>
      }

      {/* Leaderboard */}
      <Leaderboard />
    </div>);

}