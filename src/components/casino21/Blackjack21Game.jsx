import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Play, Plus, Shield } from "lucide-react";
import { playClink, playWinFanfare, playPush, playLoss } from "@/lib/sounds";
import {
  createDeck,
  shuffle,
  handValue,
  isBlackjack,
  isBust,
  isSoft,
} from "./blackjackDeck";

// ── Difficulty-driven hit/stand rules ───────────────────────────────
// Payout is never affected — these only change how hard the table plays.
//   very_easy → AI stands on 13+ (display only; it's excluded from settlement),
//               Dealer stands on all 15+
//   easy     → AI stands on 13+, Dealer stands on all 15+ (3-way winner-takes-all)
//   normal   → AI hits below 17, Dealer stands on all 17 (classic rules)
//   hard     → AI plays to beat the player's visible hand, Dealer hits soft 17
function aiShouldHit(hand, difficulty, playerVal) {
  const v = handValue(hand);
  if (difficulty === "very_easy") return v < 13; // display only — excluded from settlement
  if (difficulty === "easy") return v < 13;
  if (difficulty === "hard") {
    if (playerVal > 21) return v < 17; // player busted → AI plays safe, no need to chase
    return v < 17 && v < playerVal;   // chase until 17 or a tie/beat of the player
  }
  return v < 17; // normal
}

function dealerShouldHit(hand, difficulty) {
  const v = handValue(hand);
  if (difficulty === "very_easy") return v < 15;
  if (difficulty === "easy") return v < 15;
  if (difficulty === "hard") return v < 17 || (v === 17 && isSoft(hand)); // hit soft 17
  return v < 17; // normal
}
import HandPanel from "./HandPanel";
import { logChipMovement } from "@/lib/chipLog";
import BlackjackStats from "./BlackjackStats";
import BlackjackHistory from "./BlackjackHistory";
import ChipCashierModal from "./ChipCashierModal";
import DailyChipGiftModal from "./DailyChipGiftModal";
import MiniChipIcon from "./MiniChipIcon";
import { bruneiToday } from "@/lib/bruneiDay";

const GAME_TYPE = "blackjack";

// ── Winner-Takes-All resolution ─────────────────────────────────────
// Compares the final hands of You, Player 2 (AI), and the Dealer. Among all
// non-busted hands, the single highest score (≤21) is the sole winner.
//   • You bust        → loss (someone else is named the table winner)
//   • You sole highest → win (natural Blackjack pays 2.5×, else 2×)
//   • You tie for top  → push (refund the bet)
//   • Someone else strictly higher → loss (they are named the winner)
//
// On `very_easy` the AI is dealt for display only and is EXCLUDED from the
// settlement — the comparison is You vs the Dealer only (classic Blackjack).
function resolveRound(playerHand, aiHand, dealerHand, bet, difficulty) {
  const pVal = handValue(playerHand);
  const aVal = handValue(aiHand);
  const dVal = handValue(dealerHand);
  const pBust = pVal > 21;
  const aBust = aVal > 21;
  const dBust = dVal > 21;

  const aiCompetes = difficulty !== "very_easy";

  const valid = [];
  if (!pBust) valid.push({ who: "you", val: pVal });
  if (aiCompetes && !aBust) valid.push({ who: "ai", val: aVal });
  if (!dBust) valid.push({ who: "dealer", val: dVal });

  const maxVal = valid.length ? Math.max(...valid.map((v) => v.val)) : -1;
  const topHands = valid.filter((v) => v.val === maxVal);

  const winnerLabel = (hands) =>
    hands.map((h) => (h.who === "ai" ? "PLAYER 2" : "DEALER")).join(" & ");

  let type, detail, chipPayout;

  if (pBust) {
    type = "loss";
    chipPayout = 0;
    if (topHands.length === 0) detail = "ALL BUST";
    else if (topHands.length > 1) detail = `${winnerLabel(topHands)} TIE`;
    else if (topHands[0].who === "ai") detail = "PLAYER 2 WINS";
    else detail = "DEALER WINS";
  } else if (pVal === maxVal && topHands.length === 1) {
    type = "win";
    const natural = isBlackjack(playerHand);
    chipPayout = natural ? Math.round(bet * 2.5) : bet * 2;
    detail = natural ? "BLACKJACK! YOU WIN" : "YOU WIN";
  } else if (pVal === maxVal && topHands.length > 1) {
    type = "push";
    chipPayout = bet;
    const others = topHands.filter((h) => h.who !== "you");
    detail = `PUSH — TIED WITH ${winnerLabel(others)}`;
  } else {
    type = "loss";
    chipPayout = 0;
    if (topHands.length > 1) detail = `${winnerLabel(topHands)} TIE`;
    else if (topHands[0].who === "ai") detail = "PLAYER 2 WINS";
    else detail = "DEALER WINS";
  }

  // Player 2 display-only result line. On Very Easy it never competes for the
  // pot, so it just reports its own hand neutrally.
  let aiRes;
  if (!aiCompetes) {
    aiRes = aBust
      ? { type: "loss", detail: "Bust (display only)" }
      : { type: "push", detail: "Display only" };
  } else if (aBust) {
    aiRes = { type: "loss", detail: "Bust" };
  } else if (aVal === maxVal && topHands.length === 1 && topHands[0].who === "ai") {
    aiRes = { type: "win", detail: "Won the table" };
  } else if (aVal === maxVal) {
    aiRes = { type: "push", detail: "Tied for top" };
  } else {
    aiRes = { type: "loss", detail: "Lost the table" };
  }

  return { type, detail, chipPayout, aiRes };
}

export default function Blackjack21Game({ user, onUserUpdate }) {
  const chips = Number(user?.casinoChips) || 0;
  const chipsRef = useRef(chips);
  useEffect(() => {
    chipsRef.current = chips;
  }, [chips]);

  const [bet, setBet] = useState(5);
  const [committedBet, setCommittedBet] = useState(0);
  // The Cashier no longer opens with the game — players open it from the
  // balance strip or the bet screen whenever they want to top up.
  const [showCashier, setShowCashier] = useState(false);

  // Daily free gift: offered once per Brunei day, per user. The claim date is
  // stored on the user record (same mechanic as the Daily Spin), so a claim on
  // one device stops the popup showing on every other device until 00:00.
  const [showGift, setShowGift] = useState(false);
  useEffect(() => {
    let active = true;
    base44.auth
      .me()
      .then((fresh) => {
        if (active && fresh && fresh.last_chip_gift_date !== bruneiToday()) setShowGift(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Admin-controlled difficulty (AppSettings.blackjack_difficulty). Falls back
  // to "normal" when missing. Re-fetched when the Cashier opens so a mid-session
  // admin change is picked up without reloading the page.
  const [difficulty, setDifficulty] = useState("normal");
  useEffect(() => {
    base44.entities.AppSettings
      .list()
      .then((rows) => {
        const s = rows[0];
        if (s?.blackjack_difficulty) setDifficulty(s.blackjack_difficulty);
      })
      .catch(() => {});
  }, [showCashier]);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [ai, setAi] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [revealHole, setRevealHole] = useState(false);
  const [phase, setPhase] = useState("bet"); // bet | player | dealer | resolve
  const [result, setResult] = useState(null); // { type, detail, chipPayout, bet }
  const [aiResult, setAiResult] = useState(null); // { type, detail } — display only
  const [aiRevealed, setAiRevealed] = useState(false); // AI cards stay face-down until its turn ends
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("game");
  const [flash, setFlash] = useState(null);
  const queryClient = useQueryClient();

  const maxBet = Math.max(1, chips);
  const draw = (d) => d.pop();

  const burstConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.4 },
        colors: ["#d4af37", "#fef1c9", "#10b981", "#34d399"],
      });
      setTimeout(
        () =>
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.5 },
            colors: ["#d4af37", "#34d399"],
          }),
        150
      );
    } catch {}
  };

  // ── Round settlement (chip-based; no token movement on settle) ──────
  const settle = async (type, detail, chipPayout) => {
    setResult({ type, detail, chipPayout, bet: committedBet });
    setPhase("resolve");
    try {
      const updates = {};
      if (chipPayout > 0) updates.casinoChips = chipsRef.current + chipPayout;
      if (Object.keys(updates).length) await base44.auth.updateMe(updates);
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: GAME_TYPE,
        wager: committedBet,
        result: type === "push" ? "push" : type === "win" ? "win" : "loss",
        tokens_delta: 0,
        detail,
      });
      await onUserUpdate?.();
      const balAfter = chipPayout > 0 ? chipsRef.current + chipPayout : chipsRef.current;
      logChipMovement({ user, action_type: type, amount: chipPayout > 0 ? chipPayout : 0, balance_after: balAfter, detail: `Blackjack 21 — ${detail}` });
      queryClient.invalidateQueries({ queryKey: ["blackjack-history", user?.id] });
      if (type === "win") {
        playWinFanfare();
        setFlash("win");
        burstConfetti();
        setTimeout(() => setFlash(null), 600);
      } else if (type === "push") {
        playPush();
      } else {
        playLoss();
        setFlash("loss");
        setTimeout(() => setFlash(null), 600);
      }
    } catch {
      toast.error("Couldn't save your round. Balance may be out of sync.");
    }
  };

  // ── Deal a fresh hand (player + AI + dealer) ────────────────────────
  const handleDeal = async () => {
    if (busy) return;
    const b = Math.min(Math.max(Math.floor(bet), 1), maxBet);
    if (chips < 1) return;
    if (b > chips) {
      toast.error("Not enough chips for that bet.");
      return;
    }
    setBusy(true);
    playClink();
    setCommittedBet(b);
    await base44.auth.updateMe({ casinoChips: chips - b });
    await onUserUpdate?.();
    logChipMovement({ user, action_type: "bet", amount: -b, balance_after: chips - b, detail: `Blackjack 21 bet ${b}` });

    const d = shuffle(createDeck());
    const p = [];
    const a = [];
    const dl = [];
    setDeck([]);
    setPlayer([]);
    setAi([]);
    setDealer([]);
    setRevealHole(false);
    setResult(null);
    setAiResult(null);
    setAiRevealed(false);
    setPhase("player");

    // Deal ONE card at a time across the table. Each card mounts on its own, so
    // its slide sound fires exactly when it lands — no burst, no mismatch.
    // On Very Easy there is no Player 2 — skip dealing AI cards entirely.
    const dealOrder =
      difficulty === "very_easy" ? ["p", "d", "p", "d"] : ["p", "d", "a", "p", "d", "a"];
    for (const seat of dealOrder) {
      await new Promise((r) => setTimeout(r, 200));
      const card = draw(d);
      if (seat === "p") {
        p.push(card);
        setPlayer([...p]);
      } else if (seat === "d") {
        dl.push(card);
        setDealer([...dl]);
      } else {
        a.push(card);
        setAi([...a]);
      }
    }
    setDeck([...d]);
    setBusy(false);

    // Naturals: player blackjack, or dealer ace/ten up showing blackjack.
    // Resolve early by comparing the dealt hands — no further drawing.
    const playerBJ = isBlackjack(p);
    const upIsTenish = dl[0].value === 11 || dl[0].value === 10;
    const dealerBJ = isBlackjack(dl);
    if (playerBJ || (upIsTenish && dealerBJ)) {
      setTimeout(async () => {
        setRevealHole(true);
        setAiRevealed(true);
        const res = resolveRound(p, a, dl, b, difficulty);
        setAiResult(res.aiRes);
        await settle(res.type, res.detail, res.chipPayout);
      }, 800);
    }
  };

  // ── Hit (user only) ─────────────────────────────────────────────────
  const handleHit = () => {
    if (busy || phase !== "player") return;
    setBusy(true);
    const d = [...deck];
    const p = [...player, draw(d)];
    setDeck(d);
    setPlayer(p);
    setBusy(false);
    if (isBust(p)) {
      setTimeout(async () => {
        setPhase("dealer");
        setRevealHole(true);
        let dd = [...d];
        let dl = [...dealer];
        // Play out Player 2 + Dealer so the table winner is named correctly.
        const aiFinal = await playAI(dd);
        while (dealerShouldHit(dl, difficulty)) {
          await new Promise((r) => setTimeout(r, 420));
          dl = [...dl, draw(dd)];
          dd = [...dd];
          setDealer(dl);
          setDeck(dd);
        }
        const res = resolveRound(p, aiFinal, dl, committedBet, difficulty);
        setAiResult(res.aiRes);
        await settle(res.type, res.detail, res.chipPayout);
      }, 500);
    }
  };

  // ── AI auto-play: hit below 17, stand on 17+ (display only) ─────────
  const playAI = async (d) => {
    let a = [...ai];
    const pVal = handValue(player);
    while (aiShouldHit(a, difficulty, pVal)) {
      await new Promise((r) => setTimeout(r, 380));
      a = [...a, draw(d)];
      setAi(a);
      setDeck([...d]);
    }
    setAiRevealed(true);
    return a;
  };

  // ── Stand → AI plays, then dealer plays, then settle ────────────────
  const handleStand = async () => {
    if (busy || phase !== "player") return;
    setPhase("dealer");
    setRevealHole(true);
    let d = [...deck];
    let dl = [...dealer];

    // AI plays out first.
    const aiFinal = await playAI(d);

    // Dealer plays by the difficulty's stand threshold.
    while (dealerShouldHit(dl, difficulty)) {
      await new Promise((r) => setTimeout(r, 420));
      dl = [...dl, draw(d)];
      d = [...d];
      setDealer(dl);
      setDeck(d);
    }

    // Winner-takes-all: compare You, Player 2, and Dealer.
    const res = resolveRound(player, aiFinal, dl, committedBet, difficulty);
    setAiResult(res.aiRes);
    await settle(res.type, res.detail, res.chipPayout);
  };

  const newRound = () => {
    setPlayer([]);
    setAi([]);
    setDealer([]);
    setDeck([]);
    setRevealHole(false);
    setResult(null);
    setAiResult(null);
    setAiRevealed(false);
    setCommittedBet(0);
    setPhase("bet");
  };

  const adjustBet = (dir) => {
    setBet((b) => Math.min(Math.max(b + dir, 1), maxBet));
    playClink();
  };
  const inPlay = phase === "player" || phase === "dealer";

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Shared Game / Stats / History tab strip */}
      <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded-t-2xl">
        {[
          ["game", "🎮 Game"],
          ["stats", "📊 Stats"],
          ["history", "📜 History"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
              view === id
                ? "bg-background text-foreground border border-border shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "game" && (
        <div
          className="relative rounded-b-2xl border border-t-0 border-border p-4 flex flex-col gap-3 overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          }}
        >
          {/* Gold inner trim */}
          <div
            className="pointer-events-none absolute inset-0 rounded-b-2xl"
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(212,175,55,0.25), inset 0 0 24px rgba(212,175,55,0.08)",
            }}
          />
          {/* Win / loss flash */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: flash === "win" ? 0.35 : 0.4 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    flash === "win"
                      ? "radial-gradient(circle, rgba(16,185,129,0.5), transparent 70%)"
                      : "radial-gradient(circle, rgba(244,63,94,0.5), transparent 70%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Balance strip — Cashier + chips */}
          <div className="relative flex items-center justify-between gap-2">
            <button
              onClick={() => setShowCashier(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 border border-amber-300 text-emerald-950 text-[11px] font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(212,175,55,0.4)] hover:brightness-105 transition"
            >
              <MiniChipIcon size={14} /> Cashier
            </button>
            <div
              className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30"
              title="Blackjack 21 chips — betting currency & winnings"
            >
              <MiniChipIcon size={14} />
              <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
            </div>
          </div>

          {/* Felt plaque */}
          <div className="relative text-center -mt-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
              Win pays 2× chips · cash out in the Cashier
            </span>
          </div>

          {/* Committed pot during play — single chip + total win return */}
          {inPlay && committedBet > 0 && (
            <div className="relative flex justify-center -mt-1 -mb-1">
              <div className="flex items-center gap-1.5">
                <MiniChipIcon size={22} />
                <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
                  {committedBet * 2}
                </span>
              </div>
            </div>
          )}

          {/* Dealer seat — full width on top, cards tightly packed (hidden until reveal) */}
          <HandPanel
            title="DEALER"
            value={revealHole || phase === "resolve" ? handValue(dealer) : "?"}
            cards={dealer}
            revealHole={revealHole}
            overlap={40}
          />

          {/* You + Player 2 (AI). On Very Easy the AI is removed entirely and
              YOU renders full-width to match the Dealer panel size. */}
          {difficulty === "very_easy" ? (
            <HandPanel title="YOU" value={handValue(player)} cards={player} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <HandPanel title="YOU" value={handValue(player)} cards={player} compact />
              <HandPanel
                title="PLAYER 2"
                tag="AI"
                value={ai.length ? handValue(ai) : "—"}
                cards={ai}
                compact
                hidden={!aiRevealed}
              />
            </div>
          )}

          {/* Result overlay */}
          <AnimatePresence>
            {phase === "resolve" && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`blackjack-result-card relative text-center rounded-xl py-3 border ${
                  result.type === "win"
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                    : result.type === "push"
                    ? "bg-slate-500/20 border-slate-400/50 text-slate-100"
                    : "bg-rose-900/30 border-rose-500/50 text-rose-200"
                }`}
              >
                <p className="text-lg font-black uppercase tracking-widest">{result.detail}</p>
                <p className="text-sm font-bold tabular-nums flex items-center justify-center gap-1">
                  {result.type === "win" ? (
                    <>
                      +{result.chipPayout} <MiniChipIcon size={12} />
                    </>
                  ) : result.type === "push" ? (
                    <>
                      Refunded {result.bet} <MiniChipIcon size={12} />
                    </>
                  ) : (
                    <>
                      −{result.bet} <MiniChipIcon size={12} />
                    </>
                  )}
                </p>
                {aiResult && difficulty !== "very_easy" && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
                    AI · {aiResult.detail}
                  </p>
                )}
                <button
                  onClick={newRound}
                  className="mt-2 px-4 py-1.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-widest"
                >
                  New Round
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bet + controls */}
          {phase === "bet" && (
            <>
              <BetBar bet={bet} maxBet={maxBet} onSet={setBet} onAdjust={adjustBet} chips={chips} />
              <button
                onClick={handleDeal}
                disabled={busy || chips < 1}
                className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-emerald-700/60 text-emerald-100 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
              >
                <Play className="inline mr-1 w-4 h-4" /> Deal
              </button>
              {chips < 1 && (
                <button
                  onClick={() => setShowCashier(true)}
                  className="w-full text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
                >
                  Open the Cashier to buy chips →
                </button>
              )}
            </>
          )}

          {inPlay && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleHit}
                disabled={busy || phase === "dealer"}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                style={{ background: "#d4af37" }}
              >
                <Plus className="inline mr-1 w-4 h-4" /> Hit
              </button>
              <button
                onClick={handleStand}
                disabled={busy || phase === "dealer"}
                className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                style={{ background: "#d4af37" }}
              >
                <Shield className="inline mr-1 w-4 h-4" /> Stand
              </button>
            </div>
          )}
        </div>
      )}

      {view === "stats" && <BlackjackStats userId={user?.id} />}
      {view === "history" && <BlackjackHistory userId={user?.id} />}

      <ChipCashierModal
        user={user}
        open={showCashier}
        onClose={() => setShowCashier(false)}
        onUserUpdate={onUserUpdate}
      />

      <DailyChipGiftModal
        user={user}
        open={showGift}
        onClose={() => setShowGift(false)}
        onClaimed={onUserUpdate}
      />
    </div>
  );
}

// ── Bet slider with arrows + MAX ───────────────────────────────────────
function BetBar({ bet, maxBet, onSet, onAdjust, chips }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-1)}
          disabled={bet <= 1 || chips < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ‹
        </button>
        <input
          type="range"
          min={1}
          max={maxBet}
          step={1}
          value={Math.min(bet, maxBet)}
          onChange={(e) => onSet(Number(e.target.value))}
          disabled={chips < 1}
          className="flex-1 accent-cyan-400"
        />
        <button
          onClick={() => onAdjust(1)}
          disabled={bet >= maxBet || chips < 1}
          className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
          <MiniChipIcon size={14} />
          {bet} CHIPS
        </span>
        <button
          onClick={() => onSet(maxBet)}
          disabled={chips < 1}
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          MAX
        </button>
      </div>
    </div>
  );
}