import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, RotateCcw, Trash2, Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useDiamondSmashAudio } from "@/hooks/useDiamondSmashAudio";
import DiamondSmashMysteryMode from "@/components/games/DiamondSmashMysteryMode";

const ROWS = 8;
const COLS = 8;
const EMOJIS = ["🍬", "🍭", "🍫", "🍩", "💎"];
const POINTS = [2, 2, 2, 2, 5];
const MAX_MOVES = 20;
const GAME_TIME = 90;

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
      if (same) run++;else
      {
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
      if (same) run++;else
      {
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

// Detect connected match clusters and classify each cluster's shape.
// Shapes drive special rewards:
//   "five"  — 5 in a line            → 5× pts, +1 move, screen shake
//   "tl"    — T- or L-shape (a ≥3 horizontal run intersecting a ≥3 vertical run)
//                                     → 5× pts, +1 move, screen shake
//   "h4"    — 4 in a row (horizontal) → 2× pts, spawn Horizontal Line Gem
//   "v4"    — 4 in a column (vertical)→ 2× pts, spawn Vertical Line Gem
//   "normal"— plain 3-match           → 1× pts
function findMatchClusters(board) {
  const hRuns = [];
  const vRuns = [];

  // Horizontal runs of length ≥ 3
  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      const prev = board[r][c - 1];
      const cur = c < COLS ? board[r][c] : null;
      const same = prev && cur && prev.type === cur.type;
      if (!same) {
        const len = c - start;
        if (len >= 3 && prev) {
          const cells = [];
          for (let k = start; k < c; k++) cells.push({ r, c: k });
          hRuns.push({ type: board[r][start].type, cells, orient: "h" });
        }
        start = c;
      }
    }
  }

  // Vertical runs of length ≥ 3
  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      const prev = board[r - 1][c];
      const cur = r < ROWS ? board[r][c] : null;
      const same = prev && cur && prev.type === cur.type;
      if (!same) {
        const len = r - start;
        if (len >= 3 && prev) {
          const cells = [];
          for (let k = start; k < r; k++) cells.push({ r: k, c });
          vRuns.push({ type: board[start][c].type, cells, orient: "v" });
        }
        start = r;
      }
    }
  }

  const allRuns = [...hRuns, ...vRuns];
  if (allRuns.length === 0) return [];

  // Union-find: merge runs that share a cell (same-type intersections → T/L/+/shapes)
  const parent = allRuns.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const cellMap = new Map();
  allRuns.forEach((run, idx) => {
    for (const cell of run.cells) {
      const key = `${cell.r},${cell.c}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key).push(idx);
    }
  });
  for (const indices of cellMap.values()) {
    for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
  }

  const groups = new Map();
  allRuns.forEach((run, idx) => {
    const root = find(idx);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(run);
  });

  const clusters = [];
  for (const runs of groups.values()) {
    const type = runs[0].type;
    const cellSet = new Set();
    let maxH = 0, maxV = 0, hasH = false, hasV = false;
    for (const run of runs) {
      if (run.orient === "h") { hasH = true; maxH = Math.max(maxH, run.cells.length); }
      else { hasV = true; maxV = Math.max(maxV, run.cells.length); }
      for (const cell of run.cells) cellSet.add(`${cell.r},${cell.c}`);
    }
    const cells = Array.from(cellSet).map((s) => {
      const [r, c] = s.split(",").map(Number);
      return { r, c };
    });
    let shape = "normal";
    if (maxH >= 5 || maxV >= 5) shape = "five";
    else if (hasH && hasV) shape = "tl";
    else if (maxH === 4) shape = "h4";
    else if (maxV === 4) shape = "v4";
    clusters.push({ cells, type, shape });
  }
  return clusters;
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
const DS_TAB_ACTIVE = "bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.5)]";
const DS_TAB_INACTIVE = "border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70 hover:border-slate-400 dark:hover:border-white/25";

function Leaderboard({ scores, loading, isAdmin, onClear, clearing, currentUserId }) {
  const [primaryTab, setPrimaryTab] = useState("live"); // live | hall_of_fame
  const [hof, setHof] = useState([]);
  const [hofLoading, setHofLoading] = useState(true);
  const medals = ["🥇", "🥈", "🥉"];

  // Publicly-readable defending champion IDs (renders the 👑 cooldown row)
  const [champIds, setChampIds] = useState(() => new Set());
  const loadChamps = useCallback(async () => {
    try {
      const rows = await base44.entities.AppSettings.list();
      setChampIds(new Set(rows[0]?.defending_champ_diamond_ids || []));
    } catch {
      setChampIds(new Set());
    }
  }, []);
  useEffect(() => {loadChamps();}, [loadChamps]);
  useEffect(() => {
    const unsub = base44.entities.AppSettings.subscribe(() => loadChamps());
    return unsub;
  }, [loadChamps]);

  const loadHof = useCallback(async () => {
    try {
      const rows = await base44.entities.DiamondSmashHallOfFame.list("-awarded_at", 50);
      setHof(rows.filter((r) => r.rank === 1));
    } catch {
      setHof([]);
    }
    setHofLoading(false);
  }, []);

  useEffect(() => {loadHof();}, [loadHof]);
  useEffect(() => {
    const unsub = base44.entities.DiamondSmashHallOfFame.subscribe(() => loadHof());
    return unsub;
  }, [loadHof]);

  return (
    <div className="w-full space-y-3">
      {/* Pill tab switcher */}
      <div className="w-full flex gap-2 p-1.5 bg-muted rounded-xl border border-border backdrop-blur dark:bg-[#0a0530]/80 dark:border-white/10">
        <button
          onClick={() => setPrimaryTab("live")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${
          primaryTab === "live" ? DS_TAB_ACTIVE : DS_TAB_INACTIVE}`
          }>
          
          🏆 LIVE SCORES
        </button>
        <button
          onClick={() => setPrimaryTab("hall_of_fame")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${
          primaryTab === "hall_of_fame" ? DS_TAB_ACTIVE : DS_TAB_INACTIVE}`
          }>
          
          🎖 HALL OF FAME
        </button>
      </div>

      <div className="w-full bg-card rounded-2xl border border-border shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-fuchsia-500/30 dark:shadow-[0_0_25px_rgba(217,70,239,0.15)] overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="bg-muted border-b border-border dark:bg-gradient-to-b dark:from-slate-900 dark:to-transparent dark:border-fuchsia-500/20 px-5 py-5 relative">
          <div className="hidden dark:block absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-60" />
          <div className="flex items-center justify-center gap-6 mb-2 rounded">
            {primaryTab === "hall_of_fame" ?
            <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400 dark:drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]" /> : null


            }
            <p className="font-black uppercase tracking-widest text-fuchsia-600 dark:bg-gradient-to-r dark:from-fuchsia-400 dark:to-amber-300 dark:bg-clip-text dark:text-transparent dark:drop-shadow-[0_0_5px_rgba(217,70,239,0.8)] text-base text-center">
              {primaryTab === "live" ? "🏆 LIVE GRID SCORES" : "Hall of Fame — Season Champions"}
            </p>
          </div>
          {primaryTab === "live" ?
          <>
              <p className="text-[11px] text-muted-foreground dark:text-fuchsia-300/70 text-center leading-relaxed">
                The current season's top 10 smashers. Be in the Top 3 when the season ends to win:
              </p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2.5">
                <span className="text-[11px] font-black bg-[#ffd700]/10 px-3 py-1 rounded-md border border-[#ffd700]/40 text-[#ffd700]">🥇 1ST: 5 TOKENS</span>
                <span className="text-[11px] font-black bg-[#c0c0c0]/10 px-3 py-1 rounded-md border border-[#c0c0c0]/40 text-[#c0c0c0]">🥈 2ND: 2 TOKENS</span>
                <span className="text-[11px] font-black bg-[#cd7f32]/10 px-3 py-1 rounded-md border border-[#cd7f32]/40 text-[#cd7f32]">🥉 3RD: 1 TOKEN</span>
              </div>
              <p className="italic text-muted-foreground dark:text-fuchsia-300/60 text-center mt-3 leading-relaxed text-[9px]">⏳ Leaderboard resets once a month on every 21st of the month 11pm.

            </p>
            </> :

          <p className="text-[11px] text-muted-foreground dark:text-fuchsia-300/70 text-center leading-relaxed">
              Legendary players who claimed the crown at season's end. 👑
            </p>
          }
        </div>

        {/* Live Scores */}
        {primaryTab === "live" ?
        loading ?
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 dark:text-fuchsia-400" /></div> :
        scores.length === 0 ?
        <div className="py-12 text-center text-muted-foreground dark:text-fuchsia-300/50 text-sm tracking-widest font-bold uppercase">
              No scores yet. Be the first!
            </div> :

        <div className="divide-y divide-border dark:divide-fuchsia-500/10 bg-transparent">
              {scores.map((s, i) =>
          <div
            key={s.id}
            className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted dark:hover:bg-fuchsia-500/5 ${
            champIds.has(s.user_id) ? "opacity-60" : i < 3 ? "bg-muted/50 dark:bg-fuchsia-500/[0.03]" : ""} ${
            s.user_id === currentUserId ? "ring-1 ring-fuchsia-500/30" : ""}`}>
            
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    {i < 3 ?
              <span className="text-2xl drop-shadow-md">{medals[i]}</span> :

              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-muted text-[11px] font-black text-muted-foreground dark:bg-[#0a0418] dark:text-fuchsia-400/50 border border-border dark:border-fuchsia-500/20 shadow-inner">
                        #{i + 1}
                      </span>
              }
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-bold text-foreground dark:text-white leading-tight flex items-center gap-1.5" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    <span>{s.user_name}</span>
                    {champIds.has(s.user_id) && <span className="text-base flex-shrink-0">👑</span>}
                  </span>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 tracking-widest tabular-nums bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/30 dark:shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                      {s.score} PTS
                    </span>
                    





              
                  </div>
                </div>
          )}
            </div> : (


        /* Hall of Fame */
        hofLoading ?
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 dark:text-fuchsia-400" /></div> :
        hof.length === 0 ?
        <div className="py-12 text-center text-muted-foreground dark:text-fuchsia-300/50 text-sm tracking-widest font-bold uppercase">
              No past champions yet.
            </div> :

        <div className="divide-y divide-border dark:divide-fuchsia-500/10 bg-transparent">
              {hof.map((c) =>
          <div key={c.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted dark:hover:bg-fuchsia-500/5">
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground dark:text-white truncate block" style={{ wordBreak: "break-word" }}>
                      {c.user_name}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground dark:text-fuchsia-300/60">{c.season_label}</span>
                  </div>
                  <span className="text-sm font-black text-fuchsia-600 dark:text-fuchsia-300 tracking-widest tabular-nums flex-shrink-0 bg-fuchsia-500/10 px-3 py-1.5 rounded-lg border border-fuchsia-500/30 dark:shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                    {c.score} PTS
                  </span>
                </div>
          )}
            </div>)

        }

        {/* Admin clear — live tab only */}
        {isAdmin && primaryTab === "live" &&
        <div className="px-5 py-3 border-t border-border dark:border-fuchsia-500/20">
            <button
            onClick={onClear}
            disabled={clearing || scores.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold tracking-widest uppercase bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40">
            
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear Leaderboard
            </button>
          </div>
        }
      </div>
    </div>);

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
  const [saveFailed, setSaveFailed] = useState(false);
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [clearing, setClearing] = useState(false);
  // Mystery Mode: when the admin hides the leaderboard, players still see their own personal best
  const [hideLeaderboard, setHideLeaderboard] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const [loadingPB, setLoadingPB] = useState(true);
  // Animation state
  const [fadingIds, setFadingIds] = useState(() => new Set());

  // Audio (procedural Web Audio API) + cascade combo badge
  const {
    sfxOn, musicOn, toggleSfx, toggleMusic,
    playMatch, playCascade, playDiamond, playGameOver, startMusic, stopMusic
  } = useDiamondSmashAudio();
  const [combo, setCombo] = useState(null); // { mult, key }
  const comboTimer = useRef(null);

  const showCombo = (mult) => {
    setCombo({ mult, key: Date.now() + mult });
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(null), 800);
  };

  // Special-match popup (Line Gems & Power Matches) + screen shake (5/T/L)
  const [specialPopup, setSpecialPopup] = useState(null); // { kind: "h4"|"v4"|"power", key }
  const specialTimer = useRef(null);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef(null);

  const showSpecial = (kind) => {
    setSpecialPopup({ kind, key: Date.now() + Math.random() + kind });
    if (specialTimer.current) clearTimeout(specialTimer.current);
    specialTimer.current = setTimeout(() => setSpecialPopup(null), 900);
  };

  const triggerShake = () => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 500);
  };

  // Floating score popup (shown after each scoring move)
  const [floating, setFloating] = useState({ points: 0, reaction: "", visible: false, key: 0 });
  const floatTimer = useRef(null);

  const showFloating = (points, chainTop) => {
    if (points <= 0) return;
    const reaction =
    chainTop >= 4 ? "⚡ INSANE!" : chainTop === 3 ? "💥 Great!" : chainTop === 2 ? "🔥 Nice!" : "";
    setFloating({ points, reaction, visible: true, key: Date.now() });
    if (floatTimer.current) clearTimeout(floatTimer.current);
    floatTimer.current = setTimeout(() => setFloating((f) => ({ ...f, visible: false })), 1000);
  };

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
      Array.from(byUser.values()).
      sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).
      slice(0, 10)
    );
    setLoadingScores(false);
  }, []);

  useEffect(() => {
    loadScores();
    const unsub = base44.entities.DiamondSmashScores.subscribe(() => loadScores());
    return unsub;
  }, [loadScores]);

  // Admin visibility setting (Mystery Mode toggle)
  const loadVisibility = useCallback(async () => {
    try {
      const rows = await base44.entities.AppSettings.list();
      setHideLeaderboard(!!rows[0]?.hide_diamond_smash_leaderboard);
    } catch {
      setHideLeaderboard(false);
    }
  }, []);
  useEffect(() => {
    loadVisibility();
    const unsub = base44.entities.AppSettings.subscribe(() => loadVisibility());
    return unsub;
  }, [loadVisibility]);

  // Player's own personal best (always shown, even in Mystery Mode)
  const loadPersonalBest = useCallback(async () => {
    if (!user?.id) { setLoadingPB(false); return; }
    try {
      const rows = await base44.entities.DiamondSmashScores.filter({ user_id: user.id });
      setPersonalBest(rows[0] || null);
    } catch {
      setPersonalBest(null);
    }
    setLoadingPB(false);
  }, [user?.id]);
  useEffect(() => {
    loadPersonalBest();
  }, [loadPersonalBest]);
  // Refresh personal best after the game saves a new high score
  useEffect(() => {
    if (phase === "over" && !saving && !saveFailed) loadPersonalBest();
  }, [phase, saving, saveFailed, loadPersonalBest]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (comboTimer.current) {
        clearTimeout(comboTimer.current);
        comboTimer.current = null;
      }
      if (floatTimer.current) {
        clearTimeout(floatTimer.current);
        floatTimer.current = null;
      }
      if (specialTimer.current) {
        clearTimeout(specialTimer.current);
        specialTimer.current = null;
      }
      if (shakeTimer.current) {
        clearTimeout(shakeTimer.current);
        shakeTimer.current = null;
      }
      stopMusic();
    };
  }, [stopMusic]);

  const saveScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      setSaveFailed(false);
      const persist = async () => {
        // One entry per player — upsert their personal best only
        const existing = await base44.entities.DiamondSmashScores.filter({ user_id: user.id });
        const entry = existing[0];
        if (entry) {
          if (finalScore > (entry.score ?? 0)) {
            await base44.entities.DiamondSmashScores.update(entry.id, {
              score: finalScore,
              updated_at: new Date().toISOString()
            });
          }
        } else {
          await base44.entities.DiamondSmashScores.create({
            user_id: user.id,
            user_name: user.full_name || user.email?.split("@")[0] || "Player",
            score: finalScore,
            updated_at: new Date().toISOString()
          });
        }
      };
      // Retry transient mobile network failures (up to 3 attempts)
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await persist();
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          console.error(`Diamond Smash save attempt ${attempt} failed`, e);
          await sleep(attempt * 500);
        }
      }
      if (lastErr) {
        setSaveFailed(true);
      } else {
        await loadScores();
      }
      setSaving(false);
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
    playGameOver();
    stopMusic();
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
    setCombo(null);
    if (comboTimer.current) {clearTimeout(comboTimer.current);comboTimer.current = null;}
    setFloating({ points: 0, reaction: "", visible: false, key: 0 });
    if (floatTimer.current) {clearTimeout(floatTimer.current);floatTimer.current = null;}
    setSpecialPopup(null);
    setShake(false);
    if (specialTimer.current) {clearTimeout(specialTimer.current);specialTimer.current = null;}
    if (shakeTimer.current) {clearTimeout(shakeTimer.current);shakeTimer.current = null;}
    setPhase("playing");
    startMusic();

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
      const clusters = findMatchClusters(working);
      if (clusters.length === 0) break;
      chain++;
      const matches = clusters.flatMap((cl) => cl.cells);

      // Per-cluster shape scoring with special multipliers
      let stepScore = 0;
      let topSpecial = null; // "power" > "h4" | "v4"
      let extraMoves = 0;
      for (const cl of clusters) {
        const base = cl.cells.length * (POINTS[cl.type] ?? 0);
        let mult = 1;
        if (cl.shape === "five" || cl.shape === "tl") {
          mult = 5;            // Base Points × 5
          extraMoves += 1;     // +1 Extra Move per 5/T/L match
          topSpecial = "power";
        } else if (cl.shape === "h4") {
          mult = 2;            // Base Points × 2
          if (!topSpecial) topSpecial = "h4";
        } else if (cl.shape === "v4") {
          mult = 2;            // Base Points × 2
          if (!topSpecial) topSpecial = "v4";
        }
        stepScore += base * mult;
      }

      // Capture smash targets BEFORE mutation
      const clearedTypes = matches.
      map((m) => working[m.r][m.c]?.type).
      filter((t) => t !== undefined);
      const fadeSet = new Set(
        matches.map((m) => working[m.r][m.c]?.id).filter(Boolean)
      );

      // Sound + combo badge (no game-logic change)
      playMatch();
      if (clearedTypes.includes(4)) playDiamond();
      if (chain >= 2) {playCascade(chain);showCombo(chain);}

      // Special-match popups, screen shake & bonus moves
      if (topSpecial) {
        showSpecial(topSpecial);
        if (topSpecial === "power") triggerShake();
      }
      if (extraMoves > 0) {
        movesRef.current += extraMoves;
        setMoves(movesRef.current);
      }

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

      gained += stepScore * chain;
      await sleep(280); // let the spring settle before the next cascade
    }

    // Apply scoring + decrement moves
    const newScore = scoreRef.current + gained;
    scoreRef.current = newScore;
    setScore(newScore);

    if (gained > 0) showFloating(gained, chain);

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
      <style>{`
        @keyframes dsComboPop {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          25% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
        }
        @keyframes dsSpecialPop {
          0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
          20% { transform: translateX(-50%) scale(1.1); opacity: 1; }
          75% { transform: translateX(-50%) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.85); opacity: 0; }
        }
        @keyframes dsShake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-4px, 2px); }
          40% { transform: translate(4px, -2px); }
          60% { transform: translate(-3px, -2px); }
          80% { transform: translate(3px, 2px); }
        }
      `}</style>

      {/* Audio toggles */}
      <div className="w-full flex items-center justify-center gap-2" style={{ maxWidth: 364 }}>
        <button
          onClick={toggleSfx}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          sfxOn ?
          "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-300" :
          "bg-muted border-border text-muted-foreground line-through opacity-60"}`
          }
          aria-pressed={sfxOn}>
          
          {sfxOn ? "🔊" : "🔇"} SFX
        </button>
        <button
          onClick={toggleMusic}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          musicOn ?
          "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300" :
          "bg-muted border-border text-muted-foreground line-through opacity-60"}`
          }
          aria-pressed={musicOn}>
          
          🎵 Music
        </button>
      </div>

      {/* Stat bar */}
      <div className="w-full grid grid-cols-3 gap-2" style={{ maxWidth: 364 }}>
        <div className="relative bg-white dark:bg-card rounded-xl border border-border shadow-sm p-2 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Score</p>
          <p className="text-2xl font-black text-fuchsia-600 dark:text-fuchsia-400 tabular-nums">{score}</p>
          {floating.visible &&
          <motion.div
            key={floating.key}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.9 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 pointer-events-none whitespace-nowrap text-center">
            
              <span className="block font-black text-xl text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                +{floating.points}
              </span>
              {floating.reaction &&
            <span className="block font-black text-base text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                  {floating.reaction}
                </span>
            }
            </motion.div>
          }
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
        className={`relative isolate overflow-hidden rounded-2xl border border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.2)] bg-gradient-to-b from-[#2a1245] to-[#1a0b2e] p-2 ${shake ? "animate-[dsShake_0.5s_ease-in-out]" : ""}`}
        style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}>
        
        <div
          className="relative"
          style={{ width: BOARD_W, height: BOARD_H }}>

  {pieces.map(({ piece, r, c }) => {
            const isFading = fadingIds.has(piece.id);
            const isSel = selected && selected.r === r && selected.c === c;
            return (
              <motion.div
                key={piece.id}
                layout
                style={{
                  position: "absolute",
                  left: c * (CELL + GAP),
                  top: r * (CELL + GAP),
                  width: CELL,
                  height: CELL
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: r * 0.05 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isFading ? 0.4 : 1, opacity: isFading ? 0 : 1 }}
                className={`flex items-center justify-center ${isSel ? "z-30" : "z-20"}`}>
        
        <button
                  onPointerDown={() => handleCellClick(r, c)}
                  disabled={phase !== "playing" || busy}
                  style={{ touchAction: "none" }}
                  className={`flex items-center justify-center rounded-lg select-none w-full h-full ${
                  isSel ? "bg-fuchsia-500/40 ring-2 ring-fuchsia-400" : "bg-white/10 hover:bg-white/20"} ${
                  phase === "playing" && !busy ? "cursor-pointer" : "cursor-default"}`}>
          <span className="text-2xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {EMOJIS[piece.type]}
          </span>
        </button>
      </motion.div>);

          })}
</div>

        {/* Cascade combo badge — above all pieces & overlays (z-50) */}
        {combo &&
        <div
          key={combo.key}
          className="absolute top-1/2 left-1/2 z-50 pointer-events-none select-none"
          style={{ animation: "dsComboPop 0.8s ease-out forwards" }}>
          
            <span className="font-black text-4xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 drop-shadow-[0_0_12px_rgba(217,70,239,0.9)] whitespace-nowrap">
              {combo.mult >= 4 ? "💥" : combo.mult === 3 ? "🔥" : "✨"} x{combo.mult} COMBO!
            </span>
          </div>
        }

        {/* Special-match popup — Line Gems (↔/↕) & Power Matches (💥) */}
        {specialPopup &&
        <div
          key={specialPopup.key}
          className="absolute left-1/2 z-50 pointer-events-none select-none"
          style={{ top: "26%", animation: "dsSpecialPop 0.9s ease-out forwards" }}>
            <span className={`font-black text-3xl tracking-widest whitespace-nowrap drop-shadow-[0_0_12px_rgba(217,70,239,0.9)] ${
              specialPopup.kind === "power"
                ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-fuchsia-400 to-red-400"
                : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300"
            }`}>
              {specialPopup.kind === "h4" && "↔️ LINE GEM! ×2"}
              {specialPopup.kind === "v4" && "↕️ LINE GEM! ×2"}
              {specialPopup.kind === "power" && "💥 POWER MATCH! ×5 +1🎟️"}
            </span>
          </div>
        }

        {/* Start screen — shown only before the player starts. Removed entirely
                       during gameplay so the grid is fully visible and unobstructed. */}
        {phase === "idle" &&
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a0b2e]/75 backdrop-blur-sm z-40">
            <h1 className="font-black text-3xl text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-300 to-amber-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">
              💎 DIAMOND<br />SMASH
            </h1>
            <p className="text-[11px] text-fuchsia-300/80 text-center">
              20 moves • 90 seconds<br />
              💎 = 5 pts · 🍬, 🍭, 🍫, 🍩 = 2 pts each
            </p>
            <button
            onClick={startGame}
            className="px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.6)] hover:scale-105 transition-transform">
            
              ▶ Start Smash
            </button>
          </div>
        }

        {/* Game over overlay */}
        {phase === "over" &&
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a0b2e]/90 backdrop-blur-md border border-fuchsia-500/40 z-30">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-fuchsia-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)] text-center mt-4">
              Smash<br />Complete
            </p>
            <div className="rounded-xl px-10 py-5 flex flex-col items-center gap-1 bg-[#0a0418]/90 border border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.25)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">Final Score</p>
              <p className="font-black text-5xl tabular-nums text-amber-400 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">{score}</p>
              {saving ?
            <p className="text-[10px] text-fuchsia-400 mt-1 animate-pulse">Saving score...</p> :
            saveFailed ?
            <button onClick={() => saveScore(score)} className="text-[10px] text-red-400 mt-1 font-bold underline animate-pulse">⚠ Save failed — tap to retry</button> :
            <p className="text-[10px] text-fuchsia-400/60 mt-1">Score saved ✓</p>
            }
            </div>
            <button
            onClick={startGame}
            disabled={saving}
            className="mt-3 mb-4 w-full max-w-[220px] px-4 py-3 rounded-lg font-black text-sm tracking-widest uppercase bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-2">
            
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {saving ? "SAVING..." : "Play Again"}
            </button>
          </div>
        }
      </div>

      {/* Static how-to-play hint */}
      <div className="w-full text-center text-xs text-slate-600 dark:text-fuchsia-300/70 px-2 space-y-1" style={{ maxWidth: 364 }}>
        <p>Tap a candy, then tap next to it to swap. Match 3 or more to smash them!</p>
        <p>💥 Bonus: If pieces fall and match again automatically, you get a chain bonus — x2, x3, x4 and more!</p>
      </div>

      {/* Leaderboard — or Mystery Mode card when the admin has hidden it */}
      <div className="w-full" style={{ maxWidth: 364 }}>
        {hideLeaderboard && user?.role !== "admin" ? (
          <DiamondSmashMysteryMode
            personalBest={personalBest}
            loadingPB={loadingPB}
            currentUserId={user?.id} />
        ) : (
          <Leaderboard
            scores={scores}
            loading={loadingScores}
            isAdmin={user?.role === "admin"}
            onClear={handleClear}
            clearing={clearing}
            currentUserId={user?.id} />
        )}
      </div>
    </div>);

}