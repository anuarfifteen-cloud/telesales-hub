import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Medal } from "lucide-react";
import { toast } from "sonner";

function getRankEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function Leaderboard() {
  const { data: scores = [] } = useQuery({
    queryKey: ["tapScores"],
    queryFn: () => base44.entities.TapScore.list("-high_score", 10),
    refetchInterval: 10000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["tapUsersPublic"],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 60000,
  });

  const champUserIds = new Set(allUsers.filter(u => u.is_defending_champ).map(u => u.id));

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
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 leading-relaxed">
          Note: The Defending Champ (👑) The Defending Champ (👑) enters a one-season prize cooldown for the next round. Token prizes will go to the top 3 eligible players on the board!
        </p>
      </div>

      {scores.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">No scores yet. Be the first!</div>
      ) : (
        <div className="divide-y divide-border">
          {scores.map((s, i) => {
            const isChamp = champUserIds.has(s.user_id);
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 && !isChamp ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                <span className="text-base w-8 text-center flex-shrink-0 font-bold">{getRankEmoji(i + 1)}</span>
                <span className="flex-1 text-sm font-semibold text-foreground truncate">
                  {s.user_name}
                  {isChamp && <span className="ml-1 text-amber-500" title="Defending Champ — Prize Cooldown">👑</span>}
                </span>
                <span className="text-sm font-black text-primary tabular-nums">{s.high_score} taps</span>
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
  const intervalRef = useRef(null);
  const queryClient = useQueryClient();

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
          last_played: new Date().toISOString(),
        });
        setNewRecord(true);
      } else {
        const record = existing[0];
        if (score > record.high_score) {
          await base44.entities.TapScore.update(record.id, {
            high_score: score,
            last_played: new Date().toISOString(),
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

  const startGame = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setIsOver(false);
    setNewRecord(false);
    // Count down
    let remaining = 100; // 100 ticks of 100ms = 10.0s
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(parseFloat((remaining / 10).toFixed(1)));
      if (remaining <= 0) {
        clearTimer();
        setIsPlaying(false);
        setIsOver(true);
        setCurrentScore((prev) => {
          saveScore(prev);
          return prev;
        });
      }
    }, 100);
  };

  const handleTap = () => {
    if (!isPlaying || isOver) {
      if (!isPlaying && !isOver) startGame();
      return;
    }
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
          <span className="text-5xl font-black tabular-nums text-primary">{currentScore}</span>
        </div>
      </div>

      {/* Result / Record banner */}
      {isOver && (
        <div className={`rounded-xl px-4 py-3 text-center ${newRecord ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700" : "bg-muted border border-border"}`}>
          {saving ? (
            <p className="text-sm font-semibold text-muted-foreground">Saving score…</p>
          ) : newRecord ? (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">🎉 New personal best! {currentScore} taps!</p>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">Score: {currentScore} taps. Keep practicing!</p>
          )}
        </div>
      )}

      {/* Tap Button */}
      <div className="flex justify-center">
        <button
          onPointerDown={handleTap}
          disabled={isOver}
          className="w-48 h-48 rounded-full bg-gradient-to-b from-red-400 to-red-600 hover:to-red-700 active:scale-95 text-white text-3xl font-extrabold shadow-xl transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "none" }}
        >
          {isOver ? "⏱ Time's Up!" : isPlaying ? "TAP!" : "TAP\nto start!"}
        </button>
      </div>

      {/* Play again */}
      {isOver && !saving && (
        <button
          onClick={handleReset}
          className="mx-auto flex items-center gap-2 bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Play Again 🔄
        </button>
      )}

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  );
}