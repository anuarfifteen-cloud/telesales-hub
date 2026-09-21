import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, RotateCcw, Trash2, Crown, Lock, Coins, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useDiamondSmashAudio } from "@/hooks/useDiamondSmashAudio";
import DiamondSmashMysteryMode from "@/components/games/DiamondSmashMysteryMode";
import Board from "@/components/games/diamond-smash/Board";
import BoosterShop from "@/components/games/diamond-smash/BoosterShop";
import BoosterHUD from "@/components/games/diamond-smash/BoosterHUD";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BOARD_W, BOARD_H, MAX_MOVES, GAME_TIME, PANEL_W } from "@/components/games/diamond-smash/constants";
import {
  newPieceBoard,
  findPieceMatches,
  clearMatches,
  applyGravity,
  refill,
  computePass,
  flattenPieces,
} from "@/hooks/useMatch3";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ── Leaderboard (unchanged) ──────────────────────────────────────────────────
const DS_TAB_ACTIVE = "bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.5)]";
const DS_TAB_INACTIVE = "border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70 hover:border-slate-400 dark:hover:border-white/25";

function Leaderboard({ scores, loading, isAdmin, onClear, clearing, currentUserId }) {
  const [primaryTab, setPrimaryTab] = useState("live"); // live | hall_of_fame
  const [hof, setHof] = useState([]);
  const [hofLoading, setHofLoading] = useState(true);
  const medals = ["🥇", "🥈", "🥉"];

  const [champIds, setChampIds] = useState(() => new Set());
  const loadChamps = useCallback(async () => {
    try {
      const rows = await base44.entities.AppSettings.list();
      setChampIds(new Set(rows[0]?.defending_champ_diamond_ids || []));
    } catch {
      setChampIds(new Set());
    }
  }, []);
  useEffect(() => { loadChamps(); }, [loadChamps]);
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

  useEffect(() => { loadHof(); }, [loadHof]);
  useEffect(() => {
    const unsub = base44.entities.DiamondSmashHallOfFame.subscribe(() => loadHof());
    return unsub;
  }, [loadHof]);

  return (
    <div className="w-full space-y-3 ds-leaderboard">
      <div className="w-full flex gap-2 p-1.5 bg-muted rounded-xl border border-border backdrop-blur dark:bg-[#0a0530]/80 dark:border-white/10 ds-tabs">
        <button
          onClick={() => setPrimaryTab("live")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ds-tab ${primaryTab === "live" ? DS_TAB_ACTIVE + " ds-tab-active" : DS_TAB_INACTIVE}`}
        >
          🏆 LIVE SCORES
        </button>
        <button
          onClick={() => setPrimaryTab("hall_of_fame")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ds-tab ${primaryTab === "hall_of_fame" ? DS_TAB_ACTIVE + " ds-tab-active" : DS_TAB_INACTIVE}`}
        >
          🎖 HALL OF FAME
        </button>
      </div>

      <div className="w-full bg-card rounded-2xl border border-border shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-fuchsia-500/30 dark:shadow-[0_0_25px_rgba(217,70,239,0.15)] overflow-hidden transition-all duration-300">
        <div className="bg-muted border-b border-border dark:bg-gradient-to-b dark:from-slate-900 dark:to-transparent dark:border-fuchsia-500/20 px-5 py-5 relative">
          <div className="hidden dark:block absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-60" />
          <div className="flex items-center justify-center gap-6 mb-2 rounded">
            {primaryTab === "hall_of_fame" ? (
              <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400 dark:drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]" />
            ) : null}
            <p className="font-black uppercase tracking-widest text-fuchsia-600 dark:bg-gradient-to-r dark:from-fuchsia-400 dark:to-amber-300 dark:bg-clip-text dark:text-transparent dark:drop-shadow-[0_0_5px_rgba(217,70,239,0.8)] text-base text-center">
              {primaryTab === "live" ? "🏆 LIVE GRID SCORES" : "Hall of Fame — Season Champions"}
            </p>
          </div>
          {primaryTab === "live" ? (
            <>
              <p className="text-[11px] text-muted-foreground dark:text-fuchsia-300/70 text-center leading-relaxed">
                The current season's top 10 smashers. Be in the Top 3 when the season ends to win:
              </p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2.5">
                <span className="text-[11px] font-black bg-[#ffd700]/10 px-3 py-1 rounded-md border border-[#ffd700]/40 text-[#ffd700]">🥇 1ST: 5 TOKENS</span>
                <span className="text-[11px] font-black bg-[#c0c0c0]/10 px-3 py-1 rounded-md border border-[#c0c0c0]/40 text-[#c0c0c0]">🥈 2ND: 2 TOKENS</span>
                <span className="text-[11px] font-black bg-[#cd7f32]/10 px-3 py-1 rounded-md border border-[#cd7f32]/40 text-[#cd7f32]">🥉 3RD: 1 TOKEN</span>
              </div>
              <p className="italic text-muted-foreground dark:text-fuchsia-300/60 text-center mt-3 leading-relaxed text-[9px]">
                ⏳ Leaderboard resets once a month on every 21st of the month 11pm.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground dark:text-fuchsia-300/70 text-center leading-relaxed">
              Legendary players who claimed the crown at season's end. 👑
            </p>
          )}
        </div>

        {primaryTab === "live" ? (
          loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 dark:text-fuchsia-400" /></div>
          ) : scores.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground dark:text-fuchsia-300/50 text-sm tracking-widest font-bold uppercase">
              No scores yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-border dark:divide-fuchsia-500/10 bg-transparent">
              {scores.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted dark:hover:bg-fuchsia-500/5 ${
                    champIds.has(s.user_id) ? "opacity-60" : i < 3 ? "bg-muted/50 dark:bg-fuchsia-500/[0.03]" : ""
                  } ${s.user_id === currentUserId ? "ring-1 ring-fuchsia-500/30" : ""}`}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-2xl drop-shadow-md">{medals[i]}</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-muted text-[11px] font-black text-muted-foreground dark:bg-[#0a0418] dark:text-fuchsia-400/50 border border-border dark:border-fuchsia-500/20 shadow-inner">
                        #{i + 1}
                      </span>
                    )}
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
              ))}
            </div>
          )
        ) : (
          hofLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 dark:text-fuchsia-400" /></div>
          ) : hof.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground dark:text-fuchsia-300/50 text-sm tracking-widest font-bold uppercase">
              No past champions yet.
            </div>
          ) : (
            <div className="divide-y divide-border dark:divide-fuchsia-500/10 bg-transparent">
              {hof.map((c) => (
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
              ))}
            </div>
          )
        )}

        {isAdmin && primaryTab === "live" && (
          <div className="px-5 py-3 border-t border-border dark:border-fuchsia-500/20">
            <button
              onClick={onClear}
              disabled={clearing || scores.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold tracking-widest uppercase bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
            >
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear Leaderboard
            </button>
          </div>
        )}
      </div>
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [hideLeaderboard, setHideLeaderboard] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const [loadingPB, setLoadingPB] = useState(true);

  const {
    sfxOn, musicOn, toggleSfx, toggleMusic,
    sounds, playGameOver, startMusic, stopMusic,
  } = useDiamondSmashAudio();
  const [combo, setCombo] = useState(null); // { mult, key }
  const comboTimer = useRef(null);

  const showCombo = (mult) => {
    setCombo({ mult, key: Date.now() + mult });
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(null), 800);
  };

  // Floating score popup
  const [floating, setFloating] = useState({ points: 0, reaction: "", visible: false, key: 0 });
  const floatTimer = useRef(null);

  const showFloating = (points, reaction = "") => {
    if (points <= 0) return;
    setFloating({ points, reaction, visible: true, key: Date.now() });
    if (floatTimer.current) clearTimeout(floatTimer.current);
    floatTimer.current = setTimeout(() => setFloating((f) => ({ ...f, visible: false })), 1000);
  };

  const scoreRef = useRef(0);
  const movesRef = useRef(MAX_MOVES);
  const timeLeftRef = useRef(GAME_TIME);
  const timerRef = useRef(null);
  const endedRef = useRef(false);
  const busyRef = useRef(false);
  const timeUpRef = useRef(false);

  // ── Booster system ──
  const [activatedBooster, setActivatedBooster] = useState(null); // null | 'time_freeze' | 'end_game' | 'move_boost'
  const [boosterUsedThisGame, setBoosterUsedThisGame] = useState(false);
  const [endGameConversion, setEndGameConversion] = useState(false);
  const [boosterBusy, setBoosterBusy] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const frozenRef = useRef(false);
  const freezeRemainingRef = useRef(0);
  const [blastFlash, setBlastFlash] = useState(null); // { cells: [{r,c}], key }
  const [legendary, setLegendary] = useState(null); // { key }
  const legendaryTimer = useRef(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // "+N MOVES!" combined pop-up for diamond matches — anchored on the Moves stat
  const [movePop, setMovePop] = useState({ moves: 0, visible: false, key: 0 });
  const movePopTimer = useRef(null);
  const showMovePop = (moves) => {
    if (moves <= 0) return;
    setMovePop({ moves, visible: true, key: Date.now() });
    if (movePopTimer.current) clearTimeout(movePopTimer.current);
    movePopTimer.current = setTimeout(() => setMovePop((p) => ({ ...p, visible: false })), 1000);
  };

  const showLegendary = () => {
    setLegendary({ key: Date.now() });
    if (legendaryTimer.current) clearTimeout(legendaryTimer.current);
    legendaryTimer.current = setTimeout(() => setLegendary(null), 900);
  };

  const loadScores = useCallback(async () => {
    const rows = await base44.entities.DiamondSmashScores.list("-score", 50);
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
  useEffect(() => {
    if (phase === "over" && !saving && !saveFailed) loadPersonalBest();
  }, [phase, saving, saveFailed, loadPersonalBest]);

  useEffect(() => {
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (comboTimer.current) { clearTimeout(comboTimer.current); comboTimer.current = null; }
      if (floatTimer.current) { clearTimeout(floatTimer.current); floatTimer.current = null; }
      if (legendaryTimer.current) { clearTimeout(legendaryTimer.current); legendaryTimer.current = null; }
      if (movePopTimer.current) { clearTimeout(movePopTimer.current); movePopTimer.current = null; }
      stopMusic();
    };
  }, [stopMusic]);

  const saveScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      setSaveFailed(false);
      const persist = async () => {
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
      };
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const finishGame = (finalScore) => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopTimer();
    setFrozen(false);
    frozenRef.current = false;
    setBusy(false);
    busyRef.current = false;
    playGameOver();
    stopMusic();
    // End-Game Conversion booster: leftover moves → +250 pts each
    let score = finalScore;
    if (endGameConversion) {
      const bonus = Math.max(0, movesRef.current) * 250;
      if (bonus > 0) {
        score += bonus;
        scoreRef.current = score;
        setScore(score);
        toast.success(`End-Game Conversion: +${bonus} points!`);
      }
    }
    setPhase("over");
    saveScore(score);
  };

  const startGame = () => {
    stopTimer();
    endedRef.current = false;
    timeUpRef.current = false;
    busyRef.current = false;
    scoreRef.current = 0;
    movesRef.current = MAX_MOVES;
    timeLeftRef.current = GAME_TIME;
    // Booster state reset
    setActivatedBooster(null);
    setBoosterUsedThisGame(false);
    setEndGameConversion(false);
    setBoosterBusy(false);
    frozenRef.current = false;
    freezeRemainingRef.current = 0;
    setFrozen(false);
    setBlastFlash(null);
    setLegendary(null);
    setBoard(newPieceBoard());
    setScore(0);
    setMoves(MAX_MOVES);
    setTimeLeft(GAME_TIME);
    setSelected(null);
    setBusy(false);
    setSaving(false);
    setCombo(null);
    if (comboTimer.current) { clearTimeout(comboTimer.current); comboTimer.current = null; }
    setFloating({ points: 0, reaction: "", visible: false, key: 0 });
    if (floatTimer.current) { clearTimeout(floatTimer.current); floatTimer.current = null; }
    if (legendaryTimer.current) { clearTimeout(legendaryTimer.current); legendaryTimer.current = null; }
    if (movePopTimer.current) { clearTimeout(movePopTimer.current); movePopTimer.current = null; }
    setMovePop({ moves: 0, visible: false, key: 0 });
    setPhase("playing");
    startMusic();

    timerRef.current = setInterval(() => {
      // Time Freeze: while frozen, count down the 15s pause instead of the game timer
      if (frozenRef.current) {
        freezeRemainingRef.current -= 1;
        if (freezeRemainingRef.current <= 0) {
          frozenRef.current = false;
          setFrozen(false);
        }
        return;
      }
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        stopTimer();
        if (busyRef.current) {
          timeUpRef.current = true;
        } else {
          finishGame(scoreRef.current);
        }
      }
    }, 1000);
  };

  // Exit mid-run: stop everything, discard score (no save), collapse overlay to idle
  const exitGame = () => {
    stopTimer();
    endedRef.current = true;
    timeUpRef.current = false;
    setBusy(false);
    busyRef.current = false;
    setFrozen(false);
    frozenRef.current = false;
    freezeRemainingRef.current = 0;
    stopMusic();
    setActivatedBooster(null);
    setBoosterUsedThisGame(false);
    setEndGameConversion(false);
    setBoosterBusy(false);
    setBlastFlash(null);
    setLegendary(null);
    setCombo(null);
    if (comboTimer.current) { clearTimeout(comboTimer.current); comboTimer.current = null; }
    setFloating({ points: 0, reaction: "", visible: false, key: 0 });
    if (floatTimer.current) { clearTimeout(floatTimer.current); floatTimer.current = null; }
    if (legendaryTimer.current) { clearTimeout(legendaryTimer.current); legendaryTimer.current = null; }
    if (movePopTimer.current) { clearTimeout(movePopTimer.current); movePopTimer.current = null; }
    setMovePop({ moves: 0, visible: false, key: 0 });
    scoreRef.current = 0;
    movesRef.current = MAX_MOVES;
    timeLeftRef.current = GAME_TIME;
    setBoard(newPieceBoard());
    setScore(0);
    setMoves(MAX_MOVES);
    setTimeLeft(GAME_TIME);
    setSelected(null);
    setPhase("idle");
  };

  const confirmRestart = () => {
    setShowRestartConfirm(false);
    startGame();
  };

  // Animate one full move resolution (swap → cascades → score)
  const animateMove = async (a, b) => {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) {
      setSelected({ r: b.r, c: b.c });
      return;
    }

    const swapped = board.map((row) => row.slice());
    [swapped[a.r][a.c], swapped[b.r][b.c]] = [swapped[b.r][b.c], swapped[a.r][a.c]];
    if (findPieceMatches(swapped).length === 0) {
      setSelected(null);
      return;
    }

    setBusy(true);
    busyRef.current = true;
    setSelected(null);

    // 1. Commit the swap
    setBoard(swapped);
    await sleep(140);

    // 2. Resolve the full cascade chain — one clean pass per match:
    //    clear (fade+shrink exit) → gravity (layout slide) → refill (bounce in)
    let chain = 0;
    let gained = 0;
    let lastSpecial = null;
    let diamondMovesEarned = 0;
    let working = swapped;

    while (true) {
      if (endedRef.current) break;
      const pass = computePass(working);
      if (pass.clusters.length === 0) break;
      chain++;

      if (pass.specialLabel) {
        sounds.explosion();
        if (navigator.vibrate) navigator.vibrate(30);
      } else {
        sounds.match(chain);
        if (navigator.vibrate) navigator.vibrate(10);
      }

      if (chain >= 2) showCombo(chain);

      if (pass.isPower) {
        movesRef.current += 1;
        setMoves(movesRef.current);
        showLegendary();
      }

      // 💎 Diamond match (3+) — +1 move per diamond cluster in this pass.
      // Accumulated across the whole cascade and applied as ONE combined pop-up
      // at the end, fully additive to the legendary 6+ bonus above.
      if (pass.diamondMatchCount > 0) {
        diamondMovesEarned += pass.diamondMatchCount;
      }

      // 3×3 blast flash overlay (white pop) before tiles clear
      if (pass.blastCells && pass.blastCells.length > 0) {
        setBlastFlash({ cells: pass.blastCells, key: Date.now() + chain });
        await sleep(180);
        setBlastFlash(null);
      }

      // Clear — matched + blast tiles fade out & shrink via AnimatePresence exit
      working = clearMatches(working, pass.allClear);
      setBoard(working);
      await sleep(180);

      // Gravity — survivors slide into the gaps with a weighty, staggered fall
      // (spring ~220ms + up to ~105ms row stagger), then a landing squash thud.
      working = applyGravity(working);
      setBoard(working);
      await sleep(360);

      // Refill — new pieces bounce in
      working = refill(working);
      setBoard(working);
      await sleep(120);

      gained += pass.stepScore * chain;
      scoreRef.current += pass.stepScore * chain;
      setScore(scoreRef.current);
      if (pass.specialLabel) lastSpecial = pass.specialLabel;
    }

    // Apply the combined diamond free-move bonus at the end of the cascade
    if (diamondMovesEarned > 0) {
      movesRef.current += diamondMovesEarned;
      setMoves(movesRef.current);
      showMovePop(diamondMovesEarned);
    }

    if (gained > 0) {
      if (lastSpecial) showFloating(gained, lastSpecial);
      else if (chain >= 2) showFloating(gained, chain >= 4 ? "💥 INSANE!" : chain === 3 ? "🔥 Great!" : "✨ Nice!");
    }

    const newMoves = movesRef.current - 1;
    movesRef.current = newMoves;
    setMoves(newMoves);
    setBusy(false);
    busyRef.current = false;

    if (newMoves <= 0) finishGame(scoreRef.current);
    else if (timeUpRef.current) finishGame(scoreRef.current);
  };

  const handleCellClick = (r, c) => {
    if (phase !== "playing" || busy) return;
    if (!selected) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
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

  // On-demand mid-game booster activation (max 1 per game session).
  // Consumes 1 from persistent stock, locks the other buttons, fires the effect.
  const activateBooster = async (boosterId) => {
    if (boosterBusy || boosterUsedThisGame || phase !== "playing") return;
    const stock = user?.diamondSmashBoosters || {};
    const owned = Number(stock[boosterId]) || 0;
    if (owned <= 0) {
      toast.error("No stock! Buy this booster in the Shop below.");
      return;
    }
    setBoosterBusy(true);
    try {
      await base44.auth.updateMe({
        diamondSmashBoosters: { ...stock, [boosterId]: owned - 1 },
      });
      await onUserUpdate?.();
      setActivatedBooster(boosterId);
      setBoosterUsedThisGame(true);

      if (boosterId === "time_freeze") {
        frozenRef.current = true;
        freezeRemainingRef.current = 15;
        setFrozen(true);
        toast.success("❄️ Time Freeze! Timer paused for 15s.");
      } else if (boosterId === "move_boost") {
        movesRef.current += 10;
        setMoves(movesRef.current);
        toast.success("⚡ Move Boost! +10 moves added.");
      } else if (boosterId === "end_game") {
        setEndGameConversion(true);
        toast.success("💰 End-Game Conversion equipped! Leftover moves × 250 at game over.");
      }
    } catch (e) {
      toast.error("Activation failed. Try again.");
    } finally {
      setBoosterBusy(false);
    }
  };

  const pieces = useMemo(() => flattenPieces(board), [board]);

  return (
    <div className="ds-game-root bg-gradient-to-br from-slate-100 via-purple-50 to-slate-200 dark:from-slate-900 dark:via-purple-900/30 dark:to-slate-900 flex flex-col items-center gap-5 pb-6 p-4 sm:p-6 rounded-3xl">
      <style>{`
        @keyframes dsComboPop {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          25% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
        }

        /* ── Freeze-bar stat design ── */
        .ds-statbar {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          padding: 14px;
          background: #f7fbff;
          border: 1px solid #c9ddec;
          border-radius: 18px;
          box-shadow: 0 14px 30px rgba(53,91,122,.14), inset 0 1px 0 #fff;
          animation: dsRise 0.5s cubic-bezier(.2,.8,.2,1) both;
        }
        .dark .ds-statbar {
          background: hsl(220 14% 18%);
          border-color: hsl(220 13% 24%);
          box-shadow: 0 14px 30px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05);
        }
        .ds-stat {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 76px;
          padding: 9px 10px;
          background: #fff;
          border: 1px solid #d7e5ef;
          border-radius: 13px;
          box-shadow: 0 5px 12px rgba(61,105,136,.08);
          overflow: visible;
        }
        .ds-stat::before {
          content: "";
          position: absolute;
          top: 0; left: 18px; right: 18px;
          height: 3px;
          border-radius: 0 0 5px 5px;
          background: #b8c9d5;
        }
        .ds-stat-score::before { background: #7b8de8; }
        .ds-stat-moves::before { background: #edbd68; }
        .ds-stat-time::before { background: #45c3e6; }
        .ds-stat-label {
          margin: 0 0 6px;
          color: #8495a5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .16em;
          line-height: 1;
          text-transform: uppercase;
        }
        .ds-stat-value {
          margin: 0;
          font-size: 28px;
          font-weight: 850;
          line-height: 1;
          letter-spacing: -.04em;
          font-variant-numeric: tabular-nums;
        }
        .ds-stat-score .ds-stat-value { color: #697ce2; }
        .ds-stat-moves .ds-stat-value { color: #d89635; }
        .ds-stat-time .ds-stat-value { color: #31a9d2; }
        .ds-stat-frozen {
          background: #eefaff;
          border-color: #8bcbe5;
          box-shadow: 0 0 0 3px rgba(113,207,239,.12), 0 7px 18px rgba(62,170,207,.15);
        }
        .dark .ds-stat { background: hsl(220 14% 22%); border-color: hsl(220 13% 28%); box-shadow: 0 5px 12px rgba(0,0,0,.3); }
        .dark .ds-stat-label { color: hsl(220 10% 62%); }
        .dark .ds-stat-frozen { background: rgba(113,207,239,.14); border-color: rgba(113,207,239,.45); }
        .ds-freeze-chip {
          position: absolute;
          top: -13px; right: -8px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          background: #dff7ff;
          border: 1px solid #76cfe8;
          border-radius: 999px;
          color: #167d9d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          line-height: 1;
          box-shadow: 0 4px 10px rgba(48,157,192,.2);
          animation: dsIce 0.8s ease-out 0.35s both;
          z-index: 20;
        }
        .ds-flake { font-size: 14px; line-height: 1; animation: dsSpin 2.8s linear infinite; }
        @keyframes dsRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dsIce { 0% { opacity: 0; transform: scale(.72) translateY(5px); } 70% { opacity: 1; transform: scale(1.06) translateY(-1px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dsSpin { to { transform: rotate(360deg); } }

        /* ── 3×3 blast flash ── */
        .ds-blast-flash {
          position: absolute;
          z-index: 4;
          pointer-events: none;
          border-radius: 8px;
          background: #ffffff;
          animation: dsFlash 180ms ease-in-out forwards;
        }
        @keyframes dsFlash { 0% { opacity: 0; } 45% { opacity: 0.9; } 100% { opacity: 0; } }

        /* ── Legendary 6+ full-board shimmer ── */
        .ds-legendary {
          position: absolute;
          inset: 0;
          z-index: 15;
          pointer-events: none;
          border-radius: 24px;
          background: radial-gradient(circle, rgba(255,215,0,0.35), rgba(217,70,239,0.25), transparent 70%);
          animation: dsLegendaryShimmer 900ms ease-out forwards;
        }
        @keyframes dsLegendaryShimmer {
          0% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ds-statbar, .ds-freeze-chip, .ds-flake, .ds-blast-flash, .ds-legendary { animation: none; }
        }
      `}</style>

      {/* Full-screen play overlay — covers the bottom nav and page content while playing */}
      <div className={phase === "playing" ? "ds-play-overlay fixed inset-0 z-[60] overflow-y-auto flex flex-col items-center gap-4 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-gradient-to-br from-slate-100 via-purple-50 to-slate-200 dark:from-slate-900 dark:via-purple-900/30 dark:to-slate-900" : "contents"}>
      {phase === "playing" && (
        <div className="w-full flex items-center justify-between gap-2" style={{ maxWidth: PANEL_W }}>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-black/30 backdrop-blur-md text-white border border-white/20 hover:bg-black/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Exit
          </button>
          <button
            onClick={() => setShowRestartConfirm(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-black/30 backdrop-blur-md text-white border border-white/20 hover:bg-black/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restart
          </button>
        </div>
      )}
      {/* Audio toggles */}
      <div className="w-full flex items-center justify-center gap-2" style={{ maxWidth: PANEL_W }}>
        <button
          onClick={toggleSfx}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            sfxOn ? "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-300" : "bg-muted border-border text-muted-foreground line-through opacity-60"
          }`}
          aria-pressed={sfxOn}
        >
          {sfxOn ? "🔊" : "🔇"} SFX
        </button>
        <button
          onClick={toggleMusic}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            musicOn ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300" : "bg-muted border-border text-muted-foreground line-through opacity-60"
          }`}
          aria-pressed={musicOn}
        >
          🎵 Music
        </button>
      </div>

      {/* Stat bar — freeze-bar design */}
      <div className="ds-statbar w-full" style={{ maxWidth: PANEL_W }}>
        <div className="ds-stat ds-stat-score relative">
          <p className="ds-stat-label">Score</p>
          <p className="ds-stat-value">{score}</p>
          {floating.visible && (
            <motion.div
              key={floating.key}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.9 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 pointer-events-none whitespace-nowrap text-center"
            >
              <span className="block font-black text-xl text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                +{floating.points}
              </span>
              {floating.reaction && (
                <span className="block font-black text-base text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                  {floating.reaction}
                </span>
              )}
            </motion.div>
          )}
        </div>
        <div className="ds-stat ds-stat-moves relative">
          <p className="ds-stat-label">Moves</p>
          <p className="ds-stat-value">{moves}</p>
          {movePop.visible && (
            <motion.div
              key={movePop.key}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -42, scale: 1.1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 pointer-events-none whitespace-nowrap text-center"
            >
              <span className="block font-black text-xl text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]">
                +{movePop.moves} MOVE{movePop.moves > 1 ? "S" : ""}!
              </span>
            </motion.div>
          )}
        </div>
        <div className={`ds-stat ds-stat-time ${frozen ? "ds-stat-frozen" : ""}`}>
          {frozen && (
            <span className="ds-freeze-chip">
              <span className="ds-flake">❄</span>FROZEN
            </span>
          )}
          <p className="ds-stat-label">Time</p>
          <p className="ds-stat-value">{timeLeft}</p>
        </div>
      </div>

      {/* Board + overlays — `isolate` traps internal z-20…z-60 inside the card */}
      <div>
      <div className="relative isolate" style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}>
        <Board
          pieces={pieces}
          selected={selected}
          onCellClick={handleCellClick}
          phase={phase}
          busy={busy}
          blastFlash={blastFlash}
        />

        {/* Cascade combo badge */}
        {combo && (
          <div
            key={combo.key}
            className="absolute top-1/2 left-1/2 z-50 pointer-events-none select-none"
            style={{ animation: "dsComboPop 0.8s ease-out forwards" }}
          >
            <span className="font-black text-4xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 drop-shadow-[0_0_12px_rgba(217,70,239,0.9)] whitespace-nowrap">
              {combo.mult >= 4 ? "💥" : combo.mult === 3 ? "🔥" : "✨"} x{combo.mult} COMBO!
            </span>
          </div>
        )}

        {/* Legendary 6+ full-board shimmer */}
        {legendary && (
          <div key={legendary.key} className="ds-legendary" />
        )}

        {/* Start screen */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl z-40 border border-white/60 dark:border-slate-700/60">
            <h1 className="font-black text-3xl text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-600 to-pink-500 dark:from-fuchsia-300 dark:to-amber-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]">
              💎 DIAMOND<br />SMASH
            </h1>
            <p className="text-[11px] text-purple-700/80 dark:text-slate-300/80 text-center">
              20 moves • 90 seconds<br />
              💎 = 5 pts · 🍬, 🍭, 🍫, 🍩 = 2 pts each
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-white/70 dark:border-slate-700 rounded-3xl z-30">
            <p className="font-black text-2xl tracking-[0.3em] uppercase text-fuchsia-600 dark:text-fuchsia-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.4)] text-center mt-4">
              Smash<br />Complete
            </p>
            <div className="rounded-xl px-10 py-5 flex flex-col items-center gap-1 bg-white/70 dark:bg-slate-800/80 border border-white/80 dark:border-slate-700 shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">Final Score</p>
              <p className="font-black text-5xl tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-pink-500 dark:from-amber-300 dark:to-pink-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">{score}</p>
              {saving ? (
                <p className="text-[10px] text-purple-600 dark:text-slate-200 mt-1 animate-pulse">Saving score...</p>
              ) : saveFailed ? (
                <button onClick={() => saveScore(score)} className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-bold underline animate-pulse">⚠ Save failed — tap to retry</button>
              ) : (
                <p className="text-[10px] text-purple-600 dark:text-slate-300 mt-1">Score saved ✓</p>
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
      </div>

      {/* Mid-game booster activation HUD — constrained to canvas width for a neat, even row */}
      {phase === "playing" && (
        <div className="w-full" style={{ maxWidth: PANEL_W }}>
          <TooltipProvider>
            <BoosterHUD
              user={user}
              phase={phase}
              activatedBooster={activatedBooster}
              boosterUsedThisGame={boosterUsedThisGame}
              busy={busy}
              onActivate={activateBooster}
              buying={boosterBusy}
            />
          </TooltipProvider>
        </div>
      )}
      </div>

      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Restart run?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current progress will be lost and a new run starts immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestart}>Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Diamond Smash?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current progress and score for this run will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowExitConfirm(false); exitGame(); }}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* How-to-play hint */}
      <div className="w-full text-center text-xs text-slate-600 dark:text-slate-300 px-2 space-y-1" style={{ maxWidth: PANEL_W }}>
        <p>Tap a candy, then tap next to it to swap. Match 3 or more to smash them!</p>
        <p>💥 Bonus: If pieces fall and match again automatically, you get a chain bonus — x2, x3, x4 and more!</p>
      </div>

      {/* Booster Shop — always visible below the canvas */}
      <div className="w-full" style={{ maxWidth: PANEL_W }}>
        <BoosterShop user={user} onUserUpdate={onUserUpdate} />
      </div>

      {/* Leaderboard — or Mystery Mode card when the admin has hidden it */}
      <div className="w-full" style={{ maxWidth: PANEL_W }}>
        {hideLeaderboard && user?.role !== "admin" ? (
          <DiamondSmashMysteryMode
            personalBest={personalBest}
            loadingPB={loadingPB}
            currentUserId={user?.id}
          />
        ) : (
          <Leaderboard
            scores={scores}
            loading={loadingScores}
            isAdmin={user?.role === "admin"}
            onClear={handleClear}
            clearing={clearing}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  );
}