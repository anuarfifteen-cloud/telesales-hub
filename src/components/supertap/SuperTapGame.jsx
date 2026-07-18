import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Medal, Zap, Timer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import HallOfFame, { PrimaryTabs, SubTabs } from "@/components/games/HallOfFame";

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
  if (rank === 1) return <span className="text-xl animate-bounce drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">🥇</span>;
  if (rank === 2) return <span className="text-xl drop-shadow-[0_0_8px_rgba(192,192,192,0.8)]">🥈</span>;
  if (rank === 3) return <span className="text-xl drop-shadow-[0_0_8px_rgba(205,127,50,0.8)]">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-[11px] font-black text-muted-foreground dark:bg-[#06001a] dark:text-[#00f3ff]/60 border border-border dark:border-[#00f3ff]/20">
      {rank}
    </span>
  );
}

function getLocalDateStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
}

function Leaderboard() {
  const [primaryTab, setPrimaryTab] = useState("live");
  const [subTab, setSubTab] = useState("daily");

  const { data: scores = [] } = useQuery({
    queryKey: ["tapScores"],
    queryFn: () => base44.entities.TapScore.list("-high_score", 100),
    refetchInterval: 10000
  });

  const { data: appSettingsRows = [] } = useQuery({
    queryKey: ["appSettingsPublic"],
    queryFn: () => base44.entities.AppSettings.list(),
    refetchInterval: 60000
  });

  const champUserIds = new Set(appSettingsRows[0]?.defending_champ_supertap_ids || []);

  const today = getLocalDateStr();
  const seasonScores = scores.slice(0, 10);
  const dailyScores = scores
    .filter((s) => s.daily_date === today && (s.daily_high_score ?? 0) > 0)
    .sort((a, b) => (b.daily_high_score ?? 0) - (a.daily_high_score ?? 0))
    .slice(0, 10);

  const displayScores = subTab === "season" ? seasonScores : dailyScores;

  if (primaryTab === "hall_of_fame") {
    return (
      <div className="w-full space-y-3">
        <PrimaryTabs primaryTab={primaryTab} setPrimaryTab={setPrimaryTab} />
        <HallOfFame gameName="supertap" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <PrimaryTabs primaryTab={primaryTab} setPrimaryTab={setPrimaryTab} />
      <div className="w-full bg-card rounded-2xl border border-border shadow-sm dark:bg-[#0a0530]/90 dark:backdrop-blur-md dark:border-[#00f3ff]/30 dark:shadow-[0_0_25px_rgba(0,243,255,0.15)] overflow-hidden transition-all duration-300">
        <SubTabs subTab={subTab} setSubTab={setSubTab} />

        {/* Info box */}
        <div className="bg-muted border-b border-border dark:bg-gradient-to-r dark:from-[#06001a] dark:to-[#0a0530] dark:border-[#ff00ea]/20 px-5 py-4 mt-2">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Trophy className="w-4 h-4 text-[#ffd700] dark:drop-shadow-[0_0_5px_rgba(255,215,0,0.8)] animate-pulse" />
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-[#00f3ff] dark:drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
              {subTab === "season" ? "Live Cyber Leaderboard" : "Flash Challenge (Daily)"}
            </p>
          </div>
          {subTab === "season" ? (
            <>
              <p className="text-[11px] text-muted-foreground dark:text-[#00f3ff]/70 text-center leading-relaxed">
                The leaderboard resets twice a month (on the 16th and after the final day of the month). Be in the Top 3 when the season ends to win:
              </p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2.5">
                <span className="text-[11px] font-bold bg-[#ffd700]/10 px-2 py-0.5 rounded border border-[#ffd700]/40 text-[#ffd700]">🥇 1st: 5 Tokens</span>
                <span className="text-[11px] font-bold bg-[#c0c0c0]/10 px-2 py-0.5 rounded border border-[#c0c0c0]/40 text-[#c0c0c0]">🥈 2nd: 2 Tokens</span>
                <span className="text-[11px] font-bold bg-[#cd7f32]/10 px-2 py-0.5 rounded border border-[#cd7f32]/40 text-[#cd7f32]">🥉 3rd: 1 Token</span>
              </div>
              <p className="text-[10px] mt-2.5 leading-relaxed text-pink-600 dark:text-[#ff00ea] flex items-center justify-center gap-1 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-500 dark:bg-[#ff00ea] animate-ping mr-0.5" />
                Note: The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players!
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground dark:text-[#00f3ff]/70 text-center leading-relaxed">
              
            </p>
          )}
        </div>

        {displayScores.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground dark:text-[#00f3ff]/50 text-sm tracking-wide font-bold uppercase">
            {subTab === "season" ? "Awaiting first contestant. Enter the grid!" : "No flash scores yet today. Be the first!"}
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-[#00f3ff]/10 bg-transparent">
            {displayScores.map((s, i) => {
              const isChamp = champUserIds.has(s.user_id);
              const score = subTab === "season" ? s.high_score : s.daily_high_score;
              const tps = (score / 10).toFixed(1);
              return (
                <div key={s.id} className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted dark:hover:bg-[#00f3ff]/5 ${i < 3 && !isChamp ? "bg-cyan-500/[0.04] dark:bg-[#00f3ff]/[0.03]" : ""}`}>
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankBadge rank={i + 1} />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1 pr-2">
                    <span className="text-sm font-semibold text-foreground dark:text-white/90 truncate" style={{ wordBreak: "break-word" }}>
                      {s.user_name}
                    </span>
                    {isChamp && <span className="text-base flex-shrink-0 drop-shadow-[0_0_5px_#ffd700]" title="Defending Champ — Prize Cooldown">👑</span>}
                  </div>
                  <span className="flex flex-col items-center justify-center text-pink-600 dark:text-[#ff00ea] flex-shrink-0 bg-pink-500/10 dark:bg-[#ff00ea]/10 px-2.5 py-1 rounded-lg border border-pink-500/30 dark:border-[#ff00ea]/30 leading-tight">
                    <span className="text-sm font-black tracking-wider tabular-nums">{score} TAPS</span>
                    <span className="text-[9px] font-bold tabular-nums text-cyan-600 dark:text-[#00f3ff]">{tps} TPS</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
      const today = getLocalDateStr();
      const existing = await base44.entities.TapScore.filter({ user_id: user.id });
      if (existing.length === 0) {
        await base44.entities.TapScore.create({
          user_id: user.id,
          user_name: user.full_name || user.email,
          user_email: user.email,
          high_score: score,
          last_played: new Date().toISOString(),
          daily_high_score: score,
          daily_date: today
        });
        setNewRecord(true);
      } else {
        const record = existing[0];
        const isNewDay = record.daily_date !== today;
        const dailyHighScore = isNewDay ? score : Math.max(record.daily_high_score ?? 0, score);
        const isAllTimeRecord = score > record.high_score;
        await base44.entities.TapScore.update(record.id, {
          high_score: isAllTimeRecord ? score : record.high_score,
          last_played: new Date().toISOString(),
          daily_high_score: dailyHighScore,
          daily_date: today
        });
        setNewRecord(isAllTimeRecord);
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
  const shrinkScale = Math.max(0.3, 1 - Math.floor(currentScore / 10) * 0.1);

  return (
    <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto p-4 gap-6 select-none">
      
      {/* Dynamic Floating Styles */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0px) scale(0.8); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
        .animate-float { animation: floatUp 0.55s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
      `}</style>

      {/* Header */}
      <div className="w-full relative py-2 flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cyan-500/10 dark:bg-[#00f3ff]/10 blur-2xl rounded-full pointer-events-none" />
        <h2 className="text-3xl font-black text-cyan-600 dark:text-[#00f3ff] dark:drop-shadow-[0_0_10px_rgba(0,243,255,0.8)] tracking-tight flex items-center justify-center gap-1.5">
          SUPER TAP 2.0 <Zap className="w-6 h-6 text-cyan-600 dark:text-[#00f3ff] fill-cyan-600 dark:fill-[#00f3ff] animate-pulse" />
        </h2>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-700/70 dark:text-[#00f3ff]/60 mt-1">Grid Overload Matrix</p>
      </div>

      {/* HUD Board */}
      <div className="w-full grid grid-cols-2 gap-4 bg-card border border-border dark:bg-[#0a0530] dark:border-[#00f3ff]/30 p-4 rounded-2xl shadow-sm dark:shadow-[0_0_20px_rgba(0,243,255,0.1)] backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center p-2 relative group">
          <div className="flex items-center gap-1 text-muted-foreground dark:text-[#00f3ff]/70 text-[10px] font-black uppercase tracking-widest mb-1">
            <Timer className="w-3 h-3 text-cyan-600 dark:text-[#00f3ff]" /> Time Left
          </div>
          <span className={`text-4xl font-black tracking-tighter tabular-nums transition-colors duration-200 ${parseFloat(displayTime) <= 3 && !isOver ? "text-pink-600 dark:text-[#ff00ea] dark:drop-shadow-[0_0_15px_rgba(255,0,234,0.8)] animate-pulse" : "text-cyan-600 dark:text-[#00f3ff] dark:drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]"}`}>
            {displayTime}s
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-2 border-l border-border dark:border-[#00f3ff]/20 relative">
          <div className="text-muted-foreground dark:text-[#00f3ff]/70 text-[10px] font-black uppercase tracking-widest mb-1">
            Total Taps
          </div>
          <span
            key={currentScore}
            className="text-4xl font-black tracking-tighter tabular-nums text-pink-600 dark:text-[#ff00ea] dark:drop-shadow-[0_0_15px_rgba(255,0,234,0.6)]"
            style={{ transform: currentScore > 0 ? "scale(1.05)" : "none", transition: "transform 0.05s ease-out" }}
          >
            {currentScore}
          </span>
        </div>
      </div>

      {/* Evaluation Feedback Banner */}
      {isOver && (
        <div className="w-full">
          <div className={`rounded-xl px-4 py-3.5 text-center backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200 border ${newRecord ? "bg-pink-500/10 border-pink-500/40 dark:bg-[#ff00ea]/10 dark:border-[#ff00ea]/50 dark:shadow-[0_0_20px_rgba(255,0,234,0.2)]" : "bg-card border-border dark:bg-[#0a0530] dark:border-[#00f3ff]/30"}`}>
            {saving ? (
              <p className="text-xs font-bold text-cyan-700/80 dark:text-[#00f3ff]/80 tracking-wider uppercase animate-pulse">Syncing core network scores...</p>
            ) : newRecord ? (
              <p className="text-sm font-extrabold text-pink-600 dark:text-[#ff00ea] dark:drop-shadow-[0_0_8px_#ff00ea] uppercase tracking-widest">⚡ RECORD BREAK! Ultimate Tier: {currentScore} Taps!</p>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground dark:text-[#00f3ff]/80">Run completed: <span className="text-cyan-700 dark:text-[#00f3ff] font-bold">{currentScore} taps</span> recorded. Push limits next round!</p>
            )}
          </div>
        </div>
      )}

      {/* Core Tap Button Frame Layout */}
      <div className="w-full flex items-center justify-center my-2 relative">
        <button
          onPointerDown={handleTap}
          onPointerUp={handlePointerRelease}
          onPointerLeave={handlePointerRelease}
          disabled={isOver}
          className="relative overflow-hidden w-52 h-52 rounded-full text-white text-2xl font-black tracking-tight uppercase transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed outline-none flex items-center justify-center bg-gradient-to-br from-[#ff00ea] to-[#800075]"
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            border: "4px solid #2a2a35",
            /* ⚡ Dropped from 0.50 to 0.30 for double the compression depth */
            transform: tapped ? `scale(${shrinkScale * 0.30})` : `scale(${shrinkScale})`,
            boxShadow: tapped ?
              "0 0 50px 15px rgba(255,0,234,0.6), inset 0 4px 12px rgba(255,255,255,0.4)" :
              "0 15px 40px rgba(0,0,0,0.6), 0 0 25px rgba(255,0,234,0.3), inset 0 -8px 0 rgba(0,0,0,0.3), inset 0 6px 12px rgba(255,255,255,0.15)",
            /* ⚡ Cut from 0.05s to 0.02s for lightning-fast snap speed */
            transition: "transform 0.02s ease, box-shadow 0.02s ease"
          }}
        >
          {/* Wave Ripple Components */}
          {ripples.map((r) => (
            <span
              key={r.id}
              className="absolute rounded-full bg-white/40 animate-ping pointer-events-none"
              style={{
                width: 90, height: 90,
                left: r.x - 45, top: r.y - 45,
                animationDuration: "0.45s",
                animationIterationCount: 1
              }}
            />
          ))}

          {/* Hit Float Markers */}
          {popups.map((p) => (
            <span
              key={p.id}
              className="absolute text-xl font-black text-[#00f3ff] pointer-events-none select-none animate-float z-30 drop-shadow-[0_0_8px_#00f3ff]"
              style={{ left: p.x - 12, top: p.y - 20 }}
            >
              +1
            </span>
          ))}

          {/* Visual Grid Concentric Rim Overlay */}
          <span className="absolute inset-2.5 rounded-full border border-[#00f3ff]/20 pointer-events-none mix-blend-overlay" />
          <span className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
          
          <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-extrabold flex flex-col items-center justify-center gap-0.5 tracking-wider text-sm">
            {isOver ? (
              <span className="text-white/60 text-xs">Terminated</span>
            ) : isPlaying ? (
              <span className="text-xl font-black tracking-widest text-white drop-shadow-[0_0_8px_#ffffff] animate-pulse">TAP!</span>
            ) : (
              <span className="text-xl font-black tracking-widest text-white/90">TAP</span>
            )}
          </span>
        </button>
      </div>

      {/* Initialization Reset Button Panel */}
      {isOver && !saving && (
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 bg-transparent border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white dark:border-[#00f3ff] dark:text-[#00f3ff] dark:hover:bg-[#00f3ff] dark:hover:text-[#06001a] px-7 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all dark:shadow-[0_0_15px_rgba(0,243,255,0.2)] dark:hover:shadow-[0_0_25px_rgba(0,243,255,0.6)] active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Re-Engage Module
        </button>
      )}

      {/* Leaderboard Terminal Panel */}
      <Leaderboard />
    </div>
  );
}