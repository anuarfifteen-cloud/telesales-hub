import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ROWS = 8;
const COLS = 8;
const EMOJIS = ["🍬", "🍭", "🍫", "🍩", "💎"];
const POINTS = [10, 10, 10, 10, 20];
const MAX_MOVES = 20;
const GAME_TIME = 60;

// Fixed cell geometry (grid cells for Framer Motion layout FLIP)
const CELL = 40;
const GAP = 4;
const BOARD_W = COLS * CELL + (COLS - 1) * GAP; // 348
const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP; // 348

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

let _id = 0;
const makePiece = (type) => ({ id: ++_id, type });
const randType = () => Math.floor(Math.random() * EMOJIS.length);

// ── Board engine (piece-object based) ───────────────────────────────────────
function newPieceBoard() {
  let board;
  let guard = 0;
  do {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push(makePiece(randType()));
      board.push(row);
    }
    guard++;
  } while (findPieceMatches(board).length > 0 && guard < 200);
  return board;
}

function findPieceMatches(board) {
  const matched = new Set();
  const key = (r, c) => `${r},${c}`;
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same =
        c < COLS && board[r][c] && board[r][c - 1] && board[r][c].type === board[r][c - 1].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(key(r, c - 1 - k));
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same =
        r < ROWS && board[r][c] && board[r - 1][c] && board[r][c].type === board[r - 1][c].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(key(r - 1 - k, c));
        run = 1;
      }
    }
  }
  return Array.from(matched).map((s) => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });
}

// Smash step — remove matched pieces (leaves gaps)
function clearMatches(board, matched) {
  const next = board.map((row) => row.slice());
  matched.forEach(({ r, c }) => {
    next[r][c] = null;
  });
  return next;
}

// Gravity step — drop surviving pieces to the bottom, leaving nulls at top
function applyGravity(board) {
  const next = board.map((row) => row.slice());
  for (let c = 0; c < COLS; c++) {
    const stack = [];
    for (let r = ROWS - 1; r >= 0; r--) if (next[r][c] !== null) stack.push(next[r][c]);
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = ROWS - 1 - r;
      next[r][c] = idx < stack.length ? stack[idx] : null;
    }
  }
  return next;
}

// Refill step — spawn new pieces into remaining gaps (drop in from the top)
function refill(board) {
  const next = board.map((row) => row.slice());
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r][c] === null) next[r][c] = makePiece(randType());
    }
  }
  return next;
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
  const [board, setBoard] = useState(() => newPieceBoard());
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
  // Animation state
  const [fadingIds, setFadingIds] = useState(() => new Set());

  const scoreRef = useRef(0);
  const movesRef = useRef(MAX_MOVES);
  const timeLeftRef = useRef(GAME_TIME);
  const timerRef = useRef(null);
  const endedRef = useRef(false);

  const loadScores = useCallback(async () => {
    const rows = await base44.entities.DiamondSmashScores.list("-score", 50);
    // Keep one entry per player (their best score), then show top 10
    const byUser = new Map();
    for (const row of rows) {
      const prev = byUser.get(row.user_id);
      if (!prev || (row.score ?? 0) > (prev.score ?? 0)) byUser.set(row.user_id, row);
    }
    setScores(
      Array.from(byUser.values())
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10)
    );
    setLoadingScores(false);
  }, []);

  useEffect(() => {
    loadScores();
    const unsub = base44.entities.DiamondSmashScores.subscribe(() => loadScores());
    return unsub;
  }, [loadScores]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const saveScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        // One entry per player — upsert their personal best only
        const existing = await base44.entities.DiamondSmashScores.filter({ user_id: user.id });
        const entry = existing[0];
        if (entry) {
          if (finalScore > (entry.score ?? 0)) {
            await base44.entities.DiamondSmashScores.update(entry.id, {
              score: finalScore,
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          await base44.entities.DiamondSmashScores.create({
            user_id: user.id,
            user_name: user.full_name || user.email?.split("@")[0] || "Player",
            score: finalScore,
            updated_at: new Date().toISOString(),
          });
        }
        await loadScores();
      } catch (e) {
        console.error("Failed to save Diamond Smash score", e);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, user?.full_name, user?.email, loadScores]
  );

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishGame = (finalScore) => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopTimer();
    setBusy(false);
    setPhase("over");
    saveScore(finalScore);
  };

  const startGame = () => {
    // Full reset to prevent cross-game contamination
    stopTimer();
    endedRef.current = false;
    scoreRef.current = 0;
    movesRef.current = MAX_MOVES;
    timeLeftRef.current = GAME_TIME;
    setBoard(newPieceBoard());
    setScore(0);
    setMoves(MAX_MOVES);
    setTimeLeft(GAME_TIME);
    setSelected(null);
    setBusy(false);
    setSaving(false);
    setFadingIds(new Set());
    setPhase("playing");

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) finishGame(scoreRef.current);
    }, 1000);
  };

  // Animate one full move resolution (swap → cascades → score)
  const animateMove = async (a, b) => {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) {
      setSelected({ r: b.r, c: b.c });
      return;
    }

    // Test the swap for any matches; if none, revert silently
    const swapped = board.map((row) => row.slice());
    [swapped[a.r][a.c], swapped[b.r][b.c]] = [swapped[b.r][b.c], swapped[a.r][a.c]];
    if (findPieceMatches(swapped).length === 0) {
      setSelected(null);
      return;
    }

    setBusy(true);
    setSelected(null);

    // 1. Commit the swap — pieces slide into swapped cells
    setBoard(swapped);
    await sleep(140);

    // 2. Resolve the full cascade chain step-by-step.
    //    Each setBoard is its own render cycle so Framer Motion's layout
    //    animation tracks each gravity step as a distinct position change.
    let chain = 0;
    let gained = 0;
    let working = swapped;

    while (true) {
      const matches = findPieceMatches(working);
      if (matches.length === 0) break;
      chain++;

      // Capture scoring + smash targets BEFORE mutation
      const clearedTypes = matches
        .map((m) => working[m.r][m.c]?.type)
        .filter((t) => t !== undefined);
      const clearedBase = clearedTypes.reduce((s, t) => s + POINTS[t], 0);
      const fadeSet = new Set(
        matches.map((m) => working[m.r][m.c]?.id).filter(Boolean)
      );

      // Smash — fade the matched pieces in place
      setFadingIds(fadeSet);
      await sleep(320); // smash animation

      // Clear — remove matched pieces (gaps appear)
      working = clearMatches(working, matches);
      setBoard(working);
      await sleep(80);

      // Gravity — surviving pieces fall to the bottom (layout FLIP animation)
      working = applyGravity(working);
      setBoard(working);
      await sleep(120);

      // Refill — spawn new pieces from the top to fill remaining gaps
      working = refill(working);
      setBoard(working);
      setFadingIds(new Set());

      gained += clearedBase * chain;
      await sleep(280); // let the spring settle before the next cascade
    }

    // Apply scoring + decrement moves
    const newScore = scoreRef.current + gained;
    scoreRef.current = newScore;
    setScore(newScore);

    const newMoves = movesRef.current - 1;
    movesRef.current = newMoves;
    setMoves(newMoves);
    setBusy(false);

    if (newMoves <= 0) finishGame(newScore);
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
    animateMove(selected, { r, c });
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

  // Flatten board into renderable piece list
  const pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p) pieces.push({ piece: p, r, c });
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 pb-6">
      {/* Stat bar */}
      <div className="w-full grid grid-cols-3 gap-2" style={{ maxWidth: 364 }}>
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

      {/* Board — CSS grid + Framer Motion layout FLIP for gravity cascade */}
      <div
        className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.2)] bg-gradient-to-b from-[#2a1245] to-[#1a0b2e] p-2"
        style={{ width: BOARD_W + 16 }}
      >
        <div
          className="relative grid"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
            gap: GAP,
          }}
        >
          {pieces.map(({ piece, r, c }) => {
            const isFading = fadingIds.has(piece.id);
            const isSel = selected && selected.r === r && selected.c === c;
            return (
              <motion.div
                key={piece.id}
                layout
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: r * 0.05 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isFading ? 0.4 : 1, opacity: isFading ? 0 : 1 }}
                className={`flex items-center justify-center ${isSel ? "z-30" : "z-20"}`}
              >
                <button
                  onClick={() => handleCellClick(r, c)}
                  disabled={phase !== "playing" || busy}
                  className={`flex items-center justify-center rounded-lg select-none ${
                    isSel
                      ? "bg-fuchsia-500/40 ring-2 ring-fuchsia-400"
                      : "bg-white/10 hover:bg-white/20"
                  } ${phase === "playing" && !busy ? "cursor-pointer" : "cursor-default"}`}
                  style={{ width: CELL, height: CELL }}
                >
                  <span className="text-2xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {EMOJIS[piece.type]}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Start screen — shown only before the player starts. Removed entirely
            during gameplay so the grid is fully visible and unobstructed. */}
        {phase === "idle" && (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a0b2e] z-40">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a0b2e]/90 backdrop-blur-md border border-fuchsia-500/40 z-30">
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
      <div className="w-full" style={{ maxWidth: 364 }}>
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