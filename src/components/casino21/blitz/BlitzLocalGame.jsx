import { AnimatePresence, motion } from "framer-motion";
import { Plus, Shield, Zap, Layers } from "lucide-react";
import HandPanel from "../HandPanel";
import { handValue } from "../blackjackDeck";
import { BLITZ_WAGER } from "./blitzEngine";

// The local blackjack game area for one player during the active tournament.
// Renders the dealer's hand, the player's hand, the Blitz chip balance, and
// the deal/hit/stand/double-down controls. All state comes from useBlitzGame.
export default function BlitzLocalGame({
  blitzChips,
  playerHand,
  dealerHand,
  wager,
  phase,
  canDouble,
  result,
  locked,
  eliminated,
  dealerThinking,
  revealHole,
  onDeal,
  onHit,
  onStand,
  onDoubleClick,
}) {
  const pVal = handValue(playerHand);
  const dVal = handValue(dealerHand);
  const inHand = phase === "playing" || phase === "dealer";

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-emerald-950/30 p-3 flex flex-col gap-2">
      {/* Blitz chip balance + current wager */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-amber-200 font-black text-sm tabular-nums">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          {blitzChips} BLITZ
        </span>
        {inHand && wager > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/70">
            Wager: {wager}
          </span>
        )}
      </div>

      {/* Dealer hand */}
      <HandPanel
        title="DEALER"
        value={revealHole ? dVal : dealerHand.length > 0 ? "?" : "—"}
        cards={dealerHand}
        revealHole={revealHole}
        compact
      />
      {dealerThinking && (
        <p className="text-center text-[10px] font-bold text-amber-200/80 animate-pulse -mt-1">
          🤔 Dealer thinking...
        </p>
      )}

      {/* Player hand */}
      <HandPanel
        title="YOU"
        value={playerHand.length > 0 ? pVal : "—"}
        cards={playerHand}
        compact
      />

      {/* Result line */}
      <AnimatePresence>
        {result && phase === "settled" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center text-xs font-black uppercase tracking-widest py-1.5 rounded-full ${
              result.result === "win" || result.result === "blackjack"
                ? "bg-emerald-500/20 text-emerald-200"
                : result.result === "push"
                ? "bg-slate-400/20 text-slate-100"
                : "bg-rose-500/20 text-rose-200"
            }`}
          >
            {result.detail}
            {result.return > 0 && <span className="ml-1.5 text-amber-200">+{result.return}</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {eliminated ? (
        <p className="text-center text-[11px] font-bold text-rose-300/90 py-2">
          Eliminated — 0 Blitz Chips. Waiting for the timer.
        </p>
      ) : locked ? (
        <p className="text-center text-[11px] font-bold text-amber-200/80 py-2">
          Timer expired — settling your final score.
        </p>
      ) : phase === "idle" || phase === "settled" ? (
        <button
          onClick={onDeal}
          className="w-full py-2.5 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 transition disabled:opacity-40"
          style={{ background: "#d4af37" }}
        >
          <Zap className="inline mr-1 w-4 h-4" />
          {phase === "settled" ? "New Hand" : "Deal"} ({BLITZ_WAGER} or all-in)
        </button>
      ) : phase === "playing" ? (
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onHit}
            className="py-2.5 rounded-full font-black uppercase tracking-widest text-[11px] text-emerald-950 transition"
            style={{ background: "#d4af37" }}
          >
            <Plus className="inline mr-0.5 w-3.5 h-3.5" /> Hit
          </button>
          <button
            onClick={onStand}
            className="py-2.5 rounded-full font-black uppercase tracking-widest text-[11px] text-emerald-950 transition"
            style={{ background: "#d4af37" }}
          >
            <Shield className="inline mr-0.5 w-3.5 h-3.5" /> Stand
          </button>
          <button
            onClick={onDoubleClick}
            disabled={!canDouble}
            className="py-2.5 rounded-full font-black uppercase tracking-widest text-[11px] text-emerald-950 transition disabled:opacity-30"
            style={{ background: "#d4af37" }}
          >
            <Layers className="inline mr-0.5 w-3.5 h-3.5" /> Dbl
          </button>
        </div>
      ) : null}
    </div>
  );
}