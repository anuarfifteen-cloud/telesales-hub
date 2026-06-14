import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Medal, Zap, Timer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// ── Sound Engine (Web Audio API) ──────────────────────────────────────────────
function createAudioCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
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
  if (rank === 1) return <span className="text-xl animate-bounce">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      {rank}
    </span>
  );
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
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-xl shadow-cyan-950/20 overflow-hidden transition-all duration-300">
      {/* Info box */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border-b border-cyan-500/20 px-5 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="w-4 h-4 text-cyan-400 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-wider text-cyan-400">Live Cyber Leaderboard</p>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          The leaderboard resets twice a month (on the 15th and the final day of the month). Be in the Top 3 when the season ends to win:
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          <span className="text-[11px] font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-cyan-300">🥇 1st: 5 Tokens</span>
          <span className="text-[11px] font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-300">🥈 2nd: 2 Tokens</span>
          <span className="text-[11px] font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-purple-300">🥉 3rd: 1 Token</span>
        </div>
        <p className="text-[10px] mt-2.5 leading-relaxed text-emerald-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-ping mr-0.5" />
          Note: The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players!
        </p>
      </div>

      {scores.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm tracking-wide">Awaiting first contestant. Enter the grid!</div>
      ) : (
        <div className="divide-y divide-slate-800/60 bg-slate-950/20">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            return (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-cyan-500/5 ${i < 3 && !isChamp ? "bg-cyan-500/[0.02]" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={i + 1} />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate" style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </span>
                  {isChamp && <span className="text-base flex-shrink-0" title="Defending Champ — Prize Cooldown">👑</span>}
                </div>
                <span className="text-sm font-black text-cyan-400 tracking-wider tabular-nums flex-shrink-0 bg-cyan-950/30 px-2.5 py-1 rounded-lg border border-cyan-500/10">{s.high_score} taps</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SuperTapGame({ user }) {
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [currentScore, setCurrentScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [tapped, setTapped] = useState(false); 
  const [ripples, setRipples] = useState([]);
  const [popups, setPopups] = useState([]); // Visual tap indicator numbers (+1)
  
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rippleIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const queryClient = useQueryClient();

  // ── ANTI-CHEAT: Unique Pointer tracking ref ───────────────────────────────
  const activePointerIdRef = useRef(null);

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

    // Spawning float score numbers (+1s)
    const pId = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id: pId, x, y }]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== pId)), 600);
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
        activePointerIdRef.current = null;
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

    // ANTI-CHEAT LOCK
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    if (activePointerIdRef.current === null) {
      activePointerIdRef.current = e.pointerId;
    }

    if (!isPlaying) {
      startGame();
      return;
    }

    addRipple(e);
    setTapped(true);
    setTimeout(() => setTapped(false), 60);
    if (navigator.vibrate) navigator.vibrate(12);
    playTapSound(audioCtxRef.current);
    
    setCurrentScore((s) => s + 1);
  };

  const handlePointerRelease = (e) => {
    if (e.pointerId === activePointerIdRef.current) {
      activePointerIdRef.current = null;
    }
  };

  const handleReset = () => {
    clearTimer();
    activePointerIdRef.current = null;
    setTimeLeft(10.0);
    setCurrentScore(0);
    setIsPlaying(false);
    setIsOver(false);
    setNewRecord(false);
    setSaving(false);
    setPopups([]);
  };

  const displayTime = isOver ? "0.0" : timeLeft.toFixed(1);

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-2">
      {/* Dynamic Floating Global Styles to support the custom text pop animation */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0px) scale(0.8); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
        .animate-float { animation: floatUp 0.55s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
      `}</style>

      {/* Header */}
      <div className="text-center relative py-2">
        <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
        <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 tracking-tight flex items-center justify-center gap-1.5">
          SUPER TAP 2.0 <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400 animate-pulse" />
        </h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">Grid Overload Matrix</p>
      </div>

      {/* HUD Board */}
      <div className="grid grid-cols-2 gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-inner backdrop-blur-sm">
        <div className="flex flex-col items-center p-2 relative group">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
            <Timer className="w-3 h-3 text-slate-500" /> Time Left
          </div>
          <span className={`text-4xl font-black tracking-tighter tabular-nums transition-colors duration-200 ${parseFloat(displayTime) <= 3 && !isOver ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "text-cyan-400"}`}>
            {displayTime}s
          </span>
        </div>
        
        <div className="flex flex-col items-center p-2 border-l border-slate-800/80 relative">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
            Total Taps
          </div>
          <span
            key={currentScore}
            className="text-4xl font-black tracking-tighter tabular-nums text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.2)]"
            style={{ transform: currentScore > 0 ? "scale(1.05)" : "none", transition: "transform 0.05s ease-out" }}
          >
            {currentScore}
          </span>
        </div>
      </div>

      {/* Evaluation Feedback Banner */}
      {isOver && (
        <div className={`rounded-xl px-4 py-3.5 text-center backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200 border ${newRecord ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "bg-slate-900/80 border-slate-800"}`}>
          {saving ? (
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase animate-pulse">Syncing core network scores...</p>
          ) : newRecord ? (
            <p className="text-sm font-extrabold text-emerald-400 drop-shadow-sm">⚡ RECORD BREAK! Ultimate Tier: {currentScore} Taps!</p>
          ) : (
            <p className="text-xs font-semibold text-slate-300">Run completed: <span className="text-cyan-400 font-bold">{currentScore} taps</span> recorded. Push limits next round!</p>
          )}
        </div>
      )}

      {/* Cyber Tap Engine Button Component Grid */}
      <div className="flex justify-center my-4 relative">
        <button
          onPointerDown={handleTap}
          onPointerUp={handlePointerRelease}
          onPointerLeave={handlePointerRelease}
          disabled={isOver}
          className={`relative overflow-hidden w-52 h-52 rounded-full text-white text-2xl font-black tracking-tight uppercase shadow-2xl transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed outline-none border-4 border-slate-950
            ${tapped ?
              "bg-gradient-to-b from-cyan-300 via-sky-400 to-indigo-500 shadow-cyan-400/50" :
              "bg-gradient-to-b from-cyan-500 via-indigo-600 to-slate-900 shadow-indigo-950/60"
            }`
          }
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            transform: tapped ? "scale(0.94)" : "scale(1)",
            boxShadow: tapped ?
              "0 0 50px 15px rgba(34,211,238,0.4), inset 0 4px 12px rgba(255,255,255,0.4)" :
              "0 20px 40px rgba(0,0,0,0.4), inset 0 -8px 0 rgba(0,0,0,0.3), inset 0 6px 12px rgba(255,255,255,0.15)",
            transition: "transform 0.05s ease, box-shadow 0.05s ease"
          }}
        >
          {/* Wave Ripple Components */}
          {ripples.map((r) => (
            <span
              key={r.id}
              className="absolute rounded-full bg-cyan-400/40 animate-ping pointer-events-none"
              style={{
                width: 90, height: 90,
                left: r.x - 45, top: r.y - 45,
                animationDuration: "0.45s",
                animationIterationCount: 1
              }}
            />
          ))}

          {/* Hit Float Markers (+1 Indicators) */}
          {popups.map((p) => (
            <span
              key={p.id}
              className="absolute text-xl font-black text-cyan-200 pointer-events-none select-none animate-float z-30 drop-shadow-[0_2px_8px_rgba(34,211,238,0.6)]"
              style={{ left: p.x - 12, top: p.y - 20 }}
            >
              +1
            </span>
          ))}

          {/* Visual Grid Concentric Rim Overlay */}
          <span className="absolute inset-2.5 rounded-full border border-cyan-400/20 pointer-events-none mix-blend-overlay" />
          <span className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
          
          <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-extrabold flex flex-col items-center gap-0.5 tracking-wider text-sm">
            {isOver ? (
              <span className="text-slate-300 text-xs">Terminated</span>
            ) : isPlaying ? (
              <span className="text-xl font-black tracking-widest animate-pulse">TAP!</span>
            ) : (
              <>
                <span className="text-base font-black">TAP</span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Initialization Reset Button Panel */}
      {isOver && !saving && (
        <button
          onClick={handleReset}
          className="mx-auto flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white px-7 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-indigo-950/40 active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Re-Engage Module
        </button>
      )}

      {/* Cyber Grid Leaderboard Terminal Mount */}
      <Leaderboard />
    </div>
  );
}