import { useRef, useState, useEffect } from "react";
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
import BlackjackResultCard from "./BlackjackResultCard";
import HowToPlayButton from "./HowToPlayButton";
import BlackjackHowToPlayModal from "./BlackjackHowToPlayModal";
import MiniChipIcon from "./MiniChipIcon";

const GAME_TYPE = "blackjack";
// Chips are the betting currency, but every win pays out straight into tokens.
const MIN_BET = 5;             // table minimum
const BET_STEP = 5;            // every valid wager is a 5-chip step, which keeps…
const BLACKJACK_TOKENS = 10;   // …standard win returns whole, and a natural 21 adds this fixed bonus on top
const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
// Dealer's turn: one beat per card — hole-card flip then each draw — so both the
// new card and the running total are readable as they happen.
const DEALER_STEP_MS = 550;
// Once the dealer's hand is final, hold this long before the result popup opens,
// so the player can take in the dealer's final cards and total.
const RESULT_DELAY_MS = 1800;

/** Standard win returns stake + 1:1 profit (2× the wager), cashed in at 10 chips per token. */
function winTokens(wager) {
  return (wager * 2) / 10;
}

// ── Winner-Takes-All resolution ─────────────────────────────────────
// Compares the final hands of You, Player 2 (AI), and the Dealer. Among all
// non-busted hands, the single highest score (≤21) is the sole winner.
//   • You bust        → loss (someone else is named the table winner)
//   • You sole highest → win (a natural Blackjack pays 2× plus the fixed bonus)
//   • You tie for top  → push (refund the bet)
//   • Someone else strictly higher → loss (they are named the winner)
//
// On `very_easy` the AI is dealt for display only and is EXCLUDED from the
// settlement — the comparison is You vs the Dealer only (classic Blackjack).
function resolveRound(playerHand, aiHand, dealerHand, difficulty) {
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

  let type, detail, natural = false;

  if (pBust) {
    type = "loss";
    if (topHands.length === 0) detail = "ALL BUST";
    else if (topHands.length > 1) detail = `${winnerLabel(topHands)} TIE`;
    else if (topHands[0].who === "ai") detail = "PLAYER 2 WINS";
    else detail = "DEALER WINS";
  } else if (pVal === maxVal && topHands.length === 1) {
    type = "win";
    natural = isBlackjack(playerHand);
    detail = natural ? "BLACKJACK! YOU WIN" : "YOU WIN";
  } else if (pVal === maxVal && topHands.length > 1) {
    type = "push";
    const others = topHands.filter((h) => h.who !== "you");
    detail = `PUSH — TIED WITH ${winnerLabel(others)}`;
  } else {
    type = "loss";
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

  return { type, detail, natural, aiRes };
}

export default function Blackjack21Game({ user, onUserUpdate }) {
  const chips = Number(user?.casinoChips) || 0;
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const [bet, setBet] = useState(MIN_BET);
  const [committedBet, setCommittedBet] = useState(0);
  // The Cashier no longer opens with the game — players open it from the
  // balance strip or the bet screen whenever they want to top up.
  const [showCashier, setShowCashier] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
  const [result, setResult] = useState(null); // { type, detail, natural, tokenWin, chipRefund, bet }
  const [aiResult, setAiResult] = useState(null); // { type, detail } — display only
  const [aiRevealed, setAiRevealed] = useState(false); // AI cards stay face-down until its turn ends
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("game");
  const [flash, setFlash] = useState(null);
  // True only once RESULT_DELAY_MS has passed since the hand settled — gates the
  // result popup so the dealer's final hand is visible first.
  const [resultReady, setResultReady] = useState(false);
  // Set by "New Round" to pull the wager + Deal controls back into view.
  const [scrollToBet, setScrollToBet] = useState(false);
  const betControlsRef = useRef(null);
  const queryClient = useQueryClient();

  // Runs after New Round re-renders the bet controls, so the felt scrolls back to
  // the wager row and Deal button and the next bet can be placed immediately.
  useEffect(() => {
    if (!scrollToBet) return;
    betControlsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToBet(false);
  }, [scrollToBet]);

  // Highest legal wager: the largest 5-chip step the player can afford.
  const maxBet = Math.floor(chips / BET_STEP) * BET_STEP;
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

  // ── Round settlement ────────────────────────────────────────────────
  // The wager was already taken at deal. A win pays the token equivalent of the
  // 2× chip return (or the fixed Blackjack award) straight into the token
  // wallet, a push refunds the chips, a loss keeps them.
  // `wagerOverride` lets the automatic natural-Blackjack path pass the wager it
  // just committed, instead of reading state that hasn't re-rendered yet.
  const settle = async (type, detail, natural = false, wagerOverride) => {
    const wager = wagerOverride ?? committedBet;
    // A natural Blackjack pays the standard 2× win PLUS the fixed bonus on top.
    const tokenWin = type === "win" ? winTokens(wager) + (natural ? BLACKJACK_TOKENS : 0) : 0;
    const chipRefund = type === "push" ? wager : 0;
    setResult({ type, detail, natural, tokenWin, chipRefund, bet: wager });
    setPhase("resolve");
    // Hold the popup back so the dealer's final hand reads first. The clock
    // starts here — the exact moment the dealer stopped drawing.
    const settledAt = Date.now();
    setResultReady(false);
    setTimeout(() => setResultReady(true), RESULT_DELAY_MS);
    try {
      // Read the balances fresh so a stale screen can't overwrite them.
      const fresh = await base44.auth.me();
      const chipBalance = Number(fresh?.casinoChips) || 0;
      const tokenBalance = Number(fresh?.earlyAccessTokens) || 0;
      const updates = {};
      if (chipRefund > 0) updates.casinoChips = chipBalance + chipRefund;
      if (tokenWin > 0) updates.earlyAccessTokens = tokenBalance + tokenWin;
      if (Object.keys(updates).length) await base44.auth.updateMe(updates);
      await base44.entities.CoinFlipGame.create({
        user_id: user.id,
        user_email: user.email,
        game_type: GAME_TYPE,
        wager,
        result: type === "push" ? "push" : type === "win" ? "win" : "loss",
        tokens_delta: tokenWin,
        detail,
      });
      if (tokenWin > 0) {
        await base44.entities.TokenTransaction.create({
          user_id: user.id,
          user_name: displayName,
          amount: tokenWin,
          source: natural
            ? `Blackjack 21 Natural (2× win + ${BLACKJACK_TOKENS}-token bonus)`
            : "Blackjack 21 Win",
          timestamp: new Date().toISOString(),
        });
      }
      await onUserUpdate?.();
      logChipMovement({
        user,
        action_type: type,
        amount: chipRefund,
        balance_after: chipBalance + chipRefund,
        detail: `Blackjack 21 — ${detail}`,
      });
      queryClient.invalidateQueries({ queryKey: ["blackjack-history", user?.id] });
      if (type === "win") {
        playWinFanfare();
        setFlash("win");
        // Fire the fireworks as the result popup lands, so the two are in sync —
        // measured from the hand settling, not from whenever the saves resolved.
        setTimeout(burstConfetti, Math.max(0, RESULT_DELAY_MS - (Date.now() - settledAt)) + 130);
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
    if (chips < MIN_BET) {
      toast.error(`You need at least ${MIN_BET} chips to play.`);
      return;
    }
    setBusy(true);
    playClink();
    // Re-read the balance before taking the wager and cap it to a 5-chip step,
    // so the wager is always affordable and its 2× return is whole tokens.
    const fresh = await base44.auth.me();
    const balance = Number(fresh?.casinoChips) || 0;
    const b = Math.min(
      Math.floor(bet / BET_STEP) * BET_STEP,
      Math.floor(balance / BET_STEP) * BET_STEP
    );
    if (b < MIN_BET) {
      toast.error(`You need at least ${MIN_BET} chips to play.`);
      setBusy(false);
      await onUserUpdate?.();
      return;
    }
    setCommittedBet(b);
    await base44.auth.updateMe({ casinoChips: balance - b });
    await onUserUpdate?.();
    logChipMovement({ user, action_type: "bet", amount: -b, balance_after: balance - b, detail: `Blackjack 21 bet ${b}` });

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
    setResultReady(false);
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
        const res = resolveRound(p, a, dl, difficulty);
        setAiResult(res.aiRes);
        // Pass the wager committed in this same handler — `committedBet` state
        // is not re-rendered yet at this point, so reading it here paid 0.
        await settle(res.type, res.detail, res.natural, b);
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
        // Beat for the hole card to flip before the next card is drawn.
        await new Promise((r) => setTimeout(r, DEALER_STEP_MS));
        let dd = [...d];
        let dl = [...dealer];
        // Play out Player 2 + Dealer so the table winner is named correctly.
        const aiFinal = await playAI(dd);
        while (dealerShouldHit(dl, difficulty)) {
          await new Promise((r) => setTimeout(r, DEALER_STEP_MS));
          dl = [...dl, draw(dd)];
          dd = [...dd];
          setDealer(dl);
          setDeck(dd);
        }
        const res = resolveRound(p, aiFinal, dl, difficulty);
        setAiResult(res.aiRes);
        await settle(res.type, res.detail, res.natural);
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
    // Beat for the hole card to flip before the next card is drawn.
    await new Promise((r) => setTimeout(r, DEALER_STEP_MS));
    let d = [...deck];
    let dl = [...dealer];

    // AI plays out first.
    const aiFinal = await playAI(d);

    // Dealer plays by the difficulty's stand threshold.
    while (dealerShouldHit(dl, difficulty)) {
      await new Promise((r) => setTimeout(r, DEALER_STEP_MS));
      dl = [...dl, draw(d)];
      d = [...d];
      setDealer(dl);
      setDeck(d);
    }

    // Winner-takes-all: compare You, Player 2, and Dealer.
    const res = resolveRound(player, aiFinal, dl, difficulty);
    setAiResult(res.aiRes);
    await settle(res.type, res.detail, res.natural);
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
    setResultReady(false);
    setCommittedBet(0);
    setPhase("bet");
    // Bring the wager + Deal controls back into view for the next hand.
    setScrollToBet(true);
  };

  const adjustBet = (delta) => {
    setBet((b) => Math.min(Math.max(b + delta, MIN_BET), Math.max(maxBet, MIN_BET)));
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
            className={`flex-1 py-2 sm:py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
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
          className="relative rounded-b-2xl border border-t-0 border-border p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 overflow-hidden"
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

          {/* Balance strip — Cashier + chips + rules (wraps on narrow phones) */}
          <div className="relative flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCashier(true)}
              className="mr-auto flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-amber-400 border border-amber-300 text-emerald-950 text-[11px] font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(212,175,55,0.4)] hover:brightness-105 transition"
            >
              <MiniChipIcon size={14} /> Cashier
            </button>
            <div
              className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 border border-amber-400/30"
              title="Blackjack 21 chips — the betting currency"
            >
              <MiniChipIcon size={14} />
              <span className="text-amber-200 font-bold text-sm tabular-nums">{chips}</span>
            </div>
            <HowToPlayButton onClick={() => setShowGuide(true)} className="ml-auto" />
          </div>

          {/* Felt plaque */}
          <div className="relative text-center -mt-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/70">
              Win pays 2× in tokens · 10 chips = 1 token
            </span>
          </div>

          {/* Committed pot during play — single chip + total win return */}
          {inPlay && committedBet > 0 && (
            <div className="relative flex justify-center -mt-1 -mb-1">
              <div className="flex items-center gap-1.5">
                <MiniChipIcon size={20} />
                <span className="text-amber-200 font-black text-sm tabular-nums">{committedBet * 2}</span>
                <span className="text-amber-300/60 text-xs">→</span>
                <img src={TOKEN_IMG} alt="token" className="w-4 h-4 object-contain" />
                <span className="text-amber-200 font-black text-sm tabular-nums">{winTokens(committedBet)}</span>
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
          <BlackjackResultCard
            show={phase === "resolve" && !!result && resultReady}
            result={result}
            aiResult={aiResult}
            showAi={difficulty !== "very_easy"}
            onNewRound={newRound}
          />

          {/* Bet + controls */}
          {phase === "bet" && (
            <div ref={betControlsRef} className="flex flex-col gap-2 sm:gap-3">
              <BetBar bet={bet} maxBet={maxBet} onSet={setBet} onAdjust={adjustBet} chips={chips} />
              <button
                onClick={handleDeal}
                disabled={busy || chips < MIN_BET}
                className="w-full py-2.5 sm:py-3 rounded-full font-black uppercase tracking-widest text-sm bg-emerald-700/60 text-emerald-100 border border-emerald-400/30 disabled:opacity-40 hover:bg-emerald-600/70 transition"
              >
                <Play className="inline mr-1 w-4 h-4" /> Deal
              </button>
              {chips < MIN_BET && (
                <button
                  onClick={() => setShowCashier(true)}
                  className="w-full text-center text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
                >
                  You need {MIN_BET} chips to play — buy chips in the Cashier →
                </button>
              )}
            </div>
          )}

          {inPlay && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleHit}
                disabled={busy || phase === "dealer"}
                className="py-2.5 sm:py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                style={{ background: "#d4af37" }}
              >
                <Plus className="inline mr-1 w-4 h-4" /> Hit
              </button>
              <button
                onClick={handleStand}
                disabled={busy || phase === "dealer"}
                className="py-2.5 sm:py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
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
        onOpenGuide={() => setShowGuide(true)}
      />

      <BlackjackHowToPlayModal open={showGuide} onClose={() => setShowGuide(false)} />

    </div>
  );
}

// ── Bet slider with arrows + MAX ───────────────────────────────────────
function BetBar({ bet, maxBet, onSet, onAdjust, chips }) {
  const playable = chips >= MIN_BET;
  const sliderMax = Math.max(maxBet, MIN_BET);
  const shownBet = Math.min(Math.max(bet, MIN_BET), sliderMax);
  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-BET_STEP)}
          disabled={!playable || shownBet <= MIN_BET}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ‹
        </button>
        <input
          type="range"
          min={MIN_BET}
          max={sliderMax}
          step={BET_STEP}
          value={shownBet}
          onChange={(e) => onSet(Number(e.target.value))}
          disabled={!playable}
          className="flex-1 accent-cyan-400"
        />
        <button
          onClick={() => onAdjust(BET_STEP)}
          disabled={!playable || shownBet >= sliderMax}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
          <MiniChipIcon size={14} />
          {shownBet} CHIPS
        </span>
        <button
          onClick={() => onSet(maxBet)}
          disabled={!playable}
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
          style={{ background: "#d4af37" }}
        >
          MAX
        </button>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60 text-center">
        {MIN_BET}-chip minimum · {BET_STEP}-chip steps
      </p>
    </div>
  );
}