import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Medal, Zap, Timer, RotateCcw, Activity } from "lucide-react";
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
  if (rank === 1) return <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse">🥇</span>;
  if (rank === 2) return <span className="text-2xl drop-shadow-[0_0_8px_rgba(192,192,192,0.8)]">🥈</span>;
  if (rank === 3) return <span className="text-2xl drop-shadow-[0_0_8px_rgba(205,127,50,0.8)]">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#06001a] text-[11px] font-black text-[#00e5ff]/50 border border-[#00e5ff]/20 shadow-inner">
      #{rank}
    </span>
  );
}

function Leaderboard() {
  const { data: scores = [] } = useQuery({
    queryKey: ["tapScores"],
    queryFn: () => base44.entities.TapScore.list("-high_score", 10),
    refetchInterval: 10000
  });

  const { data: appSettingsRows = [] } = useQuery({
    queryKey: ["appSettingsPublic"],
    queryFn: () => base44.entities.AppSettings.list(),
    refetchInterval: 60000
  });

  const champUserIds = new Set(appSettingsRows[0]?.defending_champ_supertap_ids || []);

  return (
    <div className="w-full bg-[#0a0530]/90 backdrop-blur-xl rounded-2xl border border-[#00e5ff]/30 shadow-[0_0_25px_rgba(0,229,255,0.15)] overflow-hidden transition-all duration-300 relative z-10">
      <div className="bg-gradient-to-b from-[#06001a] to-transparent border-b border-[#ff00ea]/20 px-5 py-4 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ff00ea] to-transparent opacity-60"></div>
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <Trophy className="w-4 h-4 text-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.8)] animate-pulse" />
          <p className="text-xs font-black uppercase tracking-wider text-[#00f3ff] drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">Live Cyber Leaderboard</p>
        </div>
        <p className="text-[10px] text-[#00f3ff]/70 text-center leading-relaxed">
          The grid resets twice a month (15th & Final Day). Claim the Top 3 to extract tokens:
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2.5">
          <span className="text-[10px] font-black bg-[#ffd700]/10 px-2 py-0.5 rounded border border-[#ffd700]/40 text-[#ffd700]">🥇 1ST: 5 TOKENS</span>
          <span className="text-[10px] font-black bg-[#c0c0c0]/10 px-2 py-0.5 rounded border border-[#c0c0c0]/40 text-[#c0c0c0]">🥈 2ND: 2 TOKENS</span>
          <span className="text-[10px] font-black bg-[#cd7f32]/10 px-2 py-0.5 rounded border border-[#cd7f32]/40 text-[#cd7f32]">🥉 3RD: 1 TOKEN</span>
        </div>
      </div>

      {scores.length === 0 ? (
        <div className="py-10 text-center text-[#00f3ff]/50 font-bold tracking-widest text-xs uppercase">Awaiting first runner. Enter the grid!</div>
      ) : (
        <div className="divide-y divide-[#00f3ff]/10 bg-transparent">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            const isTop3 = i < 3 && !isChamp;
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#00f3ff]/5 ${isTop3 ? "bg-[#00f3ff]/[0.03]" : ""}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={i + 1} />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`text-sm font-bold truncate ${isTop3 ? 'text-white' : 'text-white/70'}`} style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </span>
                  {isChamp && <span className="text-base flex-shrink-0 drop-shadow-[0_0_5px_#ffd700]" title="Defending Champ — Prize Cooldown">👑</span>}
                </div>
                <span className="text-sm font-black text-[#ff00ea] tracking-widest tabular-nums flex-shrink-0 bg-[#ff00ea]/10 px-2 py-1 rounded-lg border border-[#ff00ea]/30 shadow-[0_0_10px_rgba(255,0,234,0.2)]">
                  {s.high_score} TAPS
                </span>
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
  const [popups, setPopups] = useState([]); 
  
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rippleIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const queryClient = useQueryClient();

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
  const timePercentage = (timeLeft / 10) * 100;
  
  // Dynamic TPS Calculation (Taps Per Second)
  const elapsedTime = 10.0 - timeLeft;
  const currentTPS = elapsedTime > 0 && !isOver ? (currentScore / elapsedTime).toFixed(1) : (isOver ? (currentScore / 10).toFixed(1) : "0.0");

  return (
    // FIX: Removed overflow-hidden, removed min-h-[85vh], changed justify-center to justify-start, added pb-24
    <div className="relative flex flex-col items-center justify-start text-center w-full max-w-md mx-auto px-4 pt-6 pb-24 gap-5 select-none bg-[#0a0530] rounded-3xl shadow-[0_0_40px_rgba(0,243,255,0.1)]">
      
      {/* THE MATRIX BACKGROUND GRID (Now contained cleanly) */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff15_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)]"></div>
      </div>
      
      {/* Dynamic Floating Styles */}
      <style>{`
        @keyframes floatUpLeft {
          0% { transform: translate(0px, 0px) scale(0.8); opacity: 1; }
          100% { transform: translate(-30px, -60px) scale(1.3); opacity: 0; }
        }
        @keyframes floatUpRight {
          0% { transform: translate(0px, 0px) scale(0.8); opacity: 1; }
          100% { transform: translate(30px, -60px) scale(1.3); opacity: 0; }
        }
        .animate-float-1 { animation: floatUpLeft 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        .animate-float-2 { animation: floatUpRight 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
      `}</style>

      {/* Header */}
      <div className="w-full relative flex flex-col items-center justify-center z-10">
        <h2 className="text-xl sm:text-2xl font-black text-[#00f3ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.8)] tracking-widest flex flex-wrap items-center justify-center gap-2 leading-tight">
          SUPER TAP 2.0 <Zap className="w-5 h-5 text-[#00f3ff] fill-[#00f3ff] animate-pulse flex-shrink-0" />
        </h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#00f3ff]/60 mt-1.5">Grid Overload Matrix</p>
      </div>

      {/* HUD Board */}
      <div className="w-full grid grid-cols-2 gap-3 bg-[#110a3a]/80 border border-[#00f3ff]/30 p-4 rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.1)] backdrop-blur-md z-10">
        
        {/* TIMER SECTION */}
        <div className="flex flex-col items-center justify-center relative pr-2 border-r border-[#00f3ff]/20">
          <div className="flex items-center gap-1 text-[#00f3ff]/70 text-[10px] font-black uppercase tracking-widest mb-1">
            <Timer className="w-3 h-3 text-[#00f3ff]" /> Time Left
          </div>
          <span className={`text-4xl font-black tracking-tighter tabular-nums transition-colors duration-200 ${parseFloat(displayTime) <= 3 && !isOver ? "text-[#ff00ea] drop-shadow-[0_0_15px_rgba(255,0,234,0.8)] animate-pulse" : "text-[#00f3ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]"}`}>
            {displayTime}s
          </span>
          {/* Neon Depletion Bar */}
          <div className="w-full max-w-[100px] h-2 bg-[#06001a] rounded-full mt-2 overflow-hidden shadow-inner border border-[#00f3ff]/20">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${parseFloat(displayTime) <= 3 ? "bg-[#ff00ea] shadow-[0_0_10px_#ff00ea]" : "bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]"}`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        </div>
        
        {/* SCORE SECTION */}
        <div className="flex flex-col items-center justify-center relative pl-2">
          <div className="text-[#00f3ff]/70 text-[10px] font-black uppercase tracking-widest mb-1">
            Total Taps
          </div>
          <span
            key={currentScore}
            className="text-4xl font-black tracking-tighter tabular-nums text-[#ff00ea] drop-shadow-[0_0_15px_rgba(255,0,234,0.6)]"
            style={{ transform: currentScore > 0 ? "scale(1.1)" : "none", transition: "transform 0.05s ease-out" }}
          >
            {currentScore}
          </span>
          {/* TPS Meter */}
          <div className="flex items-center gap-1 mt-2 bg-[#06001a] px-2.5 py-0.5 rounded-full border border-[#ff00ea]/30">
            <Activity className="w-2.5 h-2.5 text-[#ff00ea]" />
            <span className="text-[9px] font-black tracking-widest text-[#ff00ea]">TPS: {currentTPS}</span>
          </div>
        </div>
      </div>

      {/* Evaluation Feedback Banner */}
      {isOver && (
        <div className="w-full z-10">
          <div className={`rounded-xl px-3 py-3 text-center backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200 border ${newRecord ? "bg-[#ff00ea]/10 border-[#ff00ea]/50 shadow-[0_0_20px_rgba(255,0,234,0.2)]" : "bg-[#110a3a]/80 border-[#00f3ff]/30"}`}>
            {saving ? (
              <p className="text-[10px] font-bold text-[#00f3ff]/80 tracking-widest uppercase animate-pulse">Syncing matrix...</p>
            ) : newRecord ? (
              <p className="text-xs font-extrabold text-[#ff00ea] drop-shadow-[0_0_8px_#ff00ea] uppercase tracking-widest">⚡ GRID BREACH: {currentScore} TAPS! ⚡</p>
            ) : (
              <p className="text-[10px] font-bold text-[#00f3ff]/80 uppercase tracking-widest">Run Complete: <span className="text-[#00f3ff] font-black">{currentScore} taps</span> logged.</p>
            )}
          </div>
        </div>
      )}

      {/* Core Tap Button Frame Layout */}
      <div className="w-full flex items-center justify-center my-2 relative z-10">
        <button
          onPointerDown={handleTap}
          onPointerUp={handlePointerRelease}
          onPointerLeave={handlePointerRelease}
          disabled={isOver}
          // FIX: Reduced from w-60 h-60 to w-48 h-48 for better mobile fit
          className="relative overflow-hidden w-48 h-48 sm:w-56 sm:h-56 rounded-full text-white font-black tracking-widest uppercase transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed outline-none flex items-center justify-center bg-gradient-to-br from-[#ff00ea] to-[#800075]"
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            transform: tapped ? "scale(0.94) translateY(6px)" : "scale(1)",
            border: "6px solid #2a2a35",
            boxShadow: tapped ?
              "0 0 40px 15px rgba(255,0,234,0.6), inset 0 5px 15px rgba(255,255,255,0.5), inset 0 -5px 20px rgba(0,0,0,0.6)" :
              "0 15px 40px rgba(0,0,0,0.8), 0 0 25px rgba(255,0,234,0.3), inset 0 -10px 20px rgba(0,0,0,0.5), inset 0 8px 15px rgba(255,255,255,0.4)",
            transition: "transform 0.05s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.05s ease"
          }}
        >
          {/* Wave Ripple Components */}
          {ripples.map((r) => (
            <span
              key={r.id}
              className="absolute rounded-full bg-white/40 animate-ping pointer-events-none"
              style={{
                width: 80, height: 80,
                left: r.x - 40, top: r.y - 40,
                animationDuration: "0.4s",
                animationIterationCount: 1
              }}
            />
          ))}

          {/* Hit Float Markers */}
          {popups.map((p) => {
            const isCyan = p.id % 2 === 0;
            const animationClass = isCyan ? "animate-float-1" : "animate-float-2";
            return (
              <span
                key={p.id}
                className={`absolute text-2xl font-black pointer-events-none select-none z-30 ${animationClass} ${
                  isCyan ? "text-[#00f3ff] drop-shadow-[0_0_10px_#00f3ff]" : "text-[#ffffff] drop-shadow-[0_0_10px_#ffffff]"
                }`}
                style={{ left: p.x - 15, top: p.y - 15 }}
              >
                +1
              </span>
            );
          })}

          <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-extrabold flex flex-col items-center justify-center tracking-widest">
            {isOver ? (
              <span className="text-white/60 text-xs">OVERLOAD</span>
            ) : isPlaying ? (
              <span className="text-3xl font-black tracking-widest text-white drop-shadow-[0_0_8px_#ffffff]">TAP!</span>
            ) : (
              <span className="text-2xl font-black tracking-widest text-white/90">TAP</span>
            )}
          </span>
        </button>
      </div>

      {/* Initialization Reset Button Panel */}
      {isOver && !saving && (
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 bg-transparent border-2 border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff] hover:text-[#06001a] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all z-10 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)]"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Re-Engage Matrix
        </button>
      )}

      {/* Leaderboard Terminal Panel */}
      <Leaderboard />
    </div>
  );
}