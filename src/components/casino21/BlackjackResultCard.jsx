import { AnimatePresence, motion } from "framer-motion";
import MiniChipIcon from "./MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
const BLACKJACK_TOKENS = 10;

/**
 * The single card that lands when a round is settled: the outcome, what the
 * player took from it (a token award on a win, a chip refund on a push, the
 * chips lost on a loss) and the New Round button.
 */
export default function BlackjackResultCard({ show, result, aiResult, showAi, onNewRound }) {
  return (
    <AnimatePresence>
      {show && result && (
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
                +{result.tokenWin}
                <img src={TOKEN_IMG} alt="tokens" className="w-4 h-4 object-contain" />
              </>
            ) : result.type === "push" ? (
              <>
                Refunded {result.chipRefund} <MiniChipIcon size={12} />
              </>
            ) : (
              <>
                −{result.bet} <MiniChipIcon size={12} />
              </>
            )}
          </p>
          {result.type === "win" && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-100/60">
              {result.natural
                ? `Natural 21 — ${result.bet * 2} chips → ${result.tokenWin - BLACKJACK_TOKENS} tokens + ${BLACKJACK_TOKENS} bonus`
                : `Return ${result.bet * 2} chips → ${result.tokenWin} tokens`}
            </p>
          )}
          {aiResult && showAi && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
              AI · {aiResult.detail}
            </p>
          )}
          <button
            onClick={onNewRound}
            className="mt-2 px-4 py-1.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-widest"
          >
            New Round
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}