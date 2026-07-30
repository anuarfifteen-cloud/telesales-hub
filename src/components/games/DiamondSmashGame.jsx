import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ROWS = 8;
const COLS = 8;
const EMOJIS = ["🍬", "🍭", "🍫", "🍩", "💎"];
const POINTS = [10, 10, 10, 10, 20];
const MAX_MOVES = 20;
const GAME_TIME = 60;

// ── Board engine (pure helpers) ─────────────────────────────────────────────
function rand() {
  return Math.floor(Math.random() * EMOJIS.length);
}

function newBoard() {
  let board;
  let guard = 0;
  do {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push(rand());
      board.push(row);
    }
    guard++;
  } while (findMatches(board).length > 0 && guard < 200);
  return board;
}

// Returns array of { r, c } matched cells
function findMatches(board) {
  const matched = new Set();
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && board[r][c] === board[r][c - 1] && board[r][c] !== null) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r},${c - 1 - k}`);
        }
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && board[r][c] === board[r - 1][c] && board[r][c] !== null) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r - 1 - k},${c}`);
        }
        run = 1;
      }
    }
  }
  return Array.from(matched).map((s) => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });
}

// Null out matched, drop pieces, refill from top. Returns { board, clearedTypes }.
function applyGravity(board, matched) {
  const next = board.map((row) => row.slice());
  const clearedTypes = [];
  matched.forEach(({ r, c }) => {
    clearedTypes.push(board[r][c]);
    next[r][c] = null;
  });
  for (let c = 0; c < COLS; c++) {
    const stack = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (next[r][c] !== null) stack.push(next[r][c]);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = ROWS - 1 - r;
      next[r][c] = idx < stack.length ? stack[idx] : rand();
    }
  }
  return { board: next, clearedTypes };
}

// Attempt a swap of two adjacent cells. Resolves full cascade chain.
// Returns { board, scoreGained, valid }.
function processMove(board, a, b) {
  if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) {
    return { board, scoreGained: 0, valid: false };
  }
  const swapped = board.map((row) => row.slice());
  [swapped[a.r][a.c], swapped[b.r][b.c]] = [swapped[b.r][b.c], swapped[a.r][a.c]];

  let matches = findMatches(swapped);
  if (matches.length === 0) return { board, scoreGained: 0, valid: false };

  let total = 0;
  let chain = 0;
  let working = swapped;
  while (matches.length > 0) {
    chain++;
    const { board: after, clearedTypes } = applyGravity(working, matches);
    const base = clearedTypes.reduce((sum, t) => sum + POINTS[t], 0);
    total += base * chain;
    working = after;
    matches = findMatches(working);
  }
  return { board: working, scoreGained: total, valid: true };
}

// ── Leaderboard ─────────────────────────────────────────────────────────────
function Leaderboard({ scores, loading, isAdmin, onClear, clearing, currentUserId }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="w-full retro-light-panel bg-[#1a0b2e]/90 backdrop-blur-xl rounded-2xl border border-fuchsia-500/30 shadow-[0_0_25px_rgba(217,70,239,0.15)] overflow-hidden">
      <div className="bg-gradient-to-b from-[#0a0418] to-transparent border-b border-fuchsia-500/20 px-5 py-5 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-60" />
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
          <p className="text-sm font-black uppercase tracking-widest text-fuchsia-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]">
            All-Time Top Smashes
          </p>
        </div>
        <p className="text-[11px] text-fuchsia-300/70 text-center leading-relaxed">
          Top 10 diamond smashers of all time.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
        </div>
      ) : scores.length === 0 ? (
        <div className="py-12 text-center text-fuchsia-300/50 text-sm tracking-widest font-bold uppercase">
          No scores yet. Be the first!
        </div>
      ) : (
        <div className="divide-y divide-fuchsia-500/10 bg-transparent">
          {scores.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fuchsia-500/5 ${
                i < 3 ? "bg-fuchsia-500/[0.03]" : ""
              } ${s.user_id === currentUserId ? "ring-1 ring-fuchsia-500/30" : ""}`}
            >
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                {i < 3 ? (
                  <span className="text-2xl drop-shadow-md">{medals[i]}</span>
                ) : (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#0a0418] text-[11px] font-black text-fuchsia-400/50 border border-fuchsia-500/20 shadow-inner">
                    #{i + 1}
                  </span>
                )}
              </div>
              <span className="flex-1 min-w-0 text-sm font-bold text-white leading-tight" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                {s.user_name}
              </span>
              <span className="text-sm font-black text-amber-400 tracking-widest tabular-nums flex-shrink-0 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/30 shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                {s.score} PTS
              </span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="px-5 py-3 border-t border-fuchsia-500/20">
          <button
            onClick={onClear}
            disabled={clearing || scores.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold tracking-widest uppercase bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────
export default function DiamondSmashGame({ user, onUserUpdate }) {
  const [board, setBoard] = useState(() => newBoard());
  const [phase, setPhase] = useState("idle"); // idle | playing | over
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MAX_MOVES);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [clearing, setClearing] = useState(false);

  const scoreRef = useRef(0);
  const movesRef = useRef(MAX_MOVES);
  const timeLeftRef = useRef(GAME_TIME);
  const timerRef = useRef(null);

  const loadScores = useCallback(async () => {
    const rows = await base44.entities.DiamondSmashScores.list("-score", 10);
    setScores(rows);
    setLoadingScores(false);
  }, []);

  useEffect(() => {
    loadScores();
    const unsub = base44.entities.DiamondSmashScores.subscribe(() => loadScores());
    return unsub;
  }, [loadScores]);

  // Cleanup any running timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const saveScore = useCallback(async (finalScore) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await base44.entities.DiamondSmashScores.create({
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Player",
        score: finalScore,
        updated_at: new Date().toISOString(),
      });
      await loadScores();
    } catch (e) {
      console.error("Failed to save Diamond Smash score", e);
    } finally {
      setSaving(false);
    }
  }, [user?.id, user?.full_name, user?.email, loadScores]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startGame = () => {
    // Full reset to prevent cross-game contamination
    stopTimer();
    scoreRef.current = 0;
    movesRef.current = MAX_MOVES;
    timeLeftRef.current = GAME_TIME;
    setBoard(newBoard());
    setScore(0);
    setMoves(MAX_MOVES);
    setTimeLeft(GAME_TIME);
    setSelected(null);
    setBusy(false);
    setSaving(false);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        stopTimer();
        setPhase("over");
        saveScore(scoreRef.current);
      }
    }, 1000);
  };

  const handleCellClick = (r, c) => {
    if (phase !== "playing" || busy) return;

    if (!selected) {
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }
    if (Math.abs(selected.r - r) + Math.abs(selected.c - c) !== 1) {
      setSelected({ r, c });
      return;
    }

    // Adjacent swap — attempt the move
    setBusy(true);
    const { board: resolved, scoreGained, valid } = processMove(board, selected, { r, c });
    if (!valid) {
      setSelected(null);
      setBusy(false);
      return;
    }

    setBoard(resolved);
    setSelected(null);

    const newScore = scoreRef.current + scoreGained;
    scoreRef.current = newScore;
    setScore(newScore);

    const newMoves = movesRef.current - 1;
    movesRef.current = newMoves;
    setMoves(newMoves);
    setBusy(false);

    if (newMoves <= 0) {
      stopTimer();
      setPhase("over");
      saveScore(newScore);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await base44.entities.DiamondSmashScores.deleteMany({});
      await loadScores();
      toast.success("Leaderboard cleared.");
    } catch (e) {
      toast.error("Failed to clear leaderboard.");
    } finally {
      setClearing(false);
    }
  };

  const cellSize = "w-9 h-9 sm:w-10 sm:h-10 text-xl sm:text-2xl";

  return (
    <div className="flex flex-col items-center gap-5 pb-6">
      {/* Stat bar */}
      <div className="w-full grid grid-cols-3 gap-2" style={{ maxWidth: 360 }}>
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-2 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Score</p>
          <p className="text-2xl font-black text-fuchsia-600 dark:text-fuchsia-400 tabular-nums">{score}</p>
        </div>
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-2 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Moves</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{moves}</p>
        </div>
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-2 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Time</p>
          <p className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-cyan-600 dark:text-cyan-400"}`}>
            {timeLeft}
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full rounded-2xl border border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.2)] bg-gradient-to-b from-[#2a1245] to-[#1a0b2e] p-2" style={{ maxWidth: 380 }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const isSel = selected && selected.r === r && selected.c === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={phase !== "playing"}
                  className={`${cellSize} flex items-center justify-center rounded-lg transition-all duration-150 select-none ${
                    isSel
                      ? "bg-fuchsia-500/40 ring-2 ring-fuchsia-400 scale-105"
                      : "bg-white/10 hover:bg-white/20"
                  } ${phase === "playing" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{EMOJIS[val]}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Idle overlay */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-[#1a0b2e]/80 backdrop-blur-sm">
            <h1 className="font-black text-3xl text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-300 to-amber-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">
              💎 DIAMOND<br />SMASH
            </h1>
            <p className="text-xs text-white/70 text-center max-w-[260px] leading-relaxed px-4">
              Swap adjacent candies to match 3+. Chain cascades for huge multipliers!
            </p>
            <p className="text-[11px] text-fuchsia-300/80 text-center">
              20 moves • 60 seconds<br />
              💎 = 20 pts · others = 10 pts
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.6)] hover:scale-105 transition-transform"
            >
              ▶ Start Smash
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#1a0b2e]/90 backdrop-blur-md border border-fuchsia-500/40 z-10">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-fuchsia-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)] text-center mt-4">
              Smash<br />Complete
            </p>
            <div className="rounded-xl px-10 py-5 flex flex-col items-center gap-1 bg-[#0a0418]/90 border border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.25)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">Final Score</p>
              <p className="font-black text-5xl tabular-nums text-amber-400 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">{score}</p>
              {saving ? (
                <p className="text-[10px] text-fuchsia-400 mt-1 animate-pulse">Saving score...</p>
              ) : (
                <p className="text-[10px] text-fuchsia-400/60 mt-1">Score saved ✓</p>
              )}
            </div>
            <button
              onClick={startGame}
              disabled={saving}
              className="mt-3 mb-4 w-full max-w-[220px] px-4 py-3 rounded-lg font-black text-sm tracking-widest uppercase bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {saving ? "SAVING..." : "Play Again"}
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-full" style={{ maxWidth: 360 }}>
        <Leaderboard
          scores={scores}
          loading={loadingScores}
          isAdmin={user?.role === "admin"}
          onClear={handleClear}
          clearing={clearing}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
}