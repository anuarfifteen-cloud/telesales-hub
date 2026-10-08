import { AnimatePresence, motion } from "framer-motion";
import MiniChipIcon from "./MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
const BLACKJACK_TOKENS = 10;

// Frame colour per outcome — win gold, push slate, loss rose.
const FRAMES = {
  win: { border: "rgba(212,175,55,0.65)", title: "text-amber-300", glow: "0 0 46px rgba(212,175,55,0.35)" },
  push: { border: "rgba(148,163,184,0.6)", title: "text-slate-200", glow: "0 0 40px rgba(148,163,184,0.25)" },
  loss: { border: "rgba(244,63,94,0.6)", title: "text-rose-300", glow: "0 0 40px rgba(244,63,94,0.28)" },
};

/** One labelled line of the payout breakdown. `bonus` marks the Blackjack award. */
function Row({ label, children, bonus = false }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-3xl px-3.5 py-2"
      style={{
        background: bonus ? "rgba(212,175,55,0.16)" : "rgba(6,40,30,0.66)",
        boxShadow: bonus
          ? "inset 0 0 0 1.5px rgba(212,175,55,0.6)"
          : "inset 0 0 0 1px rgba(52,211,153,0.2)",
      }}
    >
      <span
        className={`text-[10px] font-black uppercase tracking-widest ${
          bonus ? "text-amber-300" : "text-emerald-100/70"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex items-center gap-1 text-xs font-black tabular-nums ${
          bonus ? "text-amber-200" : "text-emerald-100/90"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * Every round ends on this popup: it springs up over the felt and itemises what
 * the hand paid — the 2× wager win cashed in at 10 chips = 1 token, and, on a
 * natural 21, the flat 10-token Blackjack bonus on its own gold line.
 */
export default function BlackjackResultCard({ show, result, aiResult, showAi, onNewRound }) {
  const frame = FRAMES[result?.type] || FRAMES.loss;
  const bonus = result?.type === "win" && result?.natural ? BLACKJACK_TOKENS : 0;
  // tokenWin already includes the bonus, so the bet-based award is the rest.
  const winTokens = Math.max(0, (Number(result?.tokenWin) || 0) - bonus);

  return (
    <AnimatePresence>
      {show && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center p-6"
          style={{ background: "rgba(2,12,9,0.72)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="w-full max-w-[19rem] rounded-3xl px-4 py-5 text-center"
            style={{
              background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
              border: `2px solid ${frame.border}`,
              boxShadow: `${frame.glow}, 0 20px 60px rgba(0,0,0,0.65)`,
            }}
          >
            <p className={`text-xl font-black uppercase tracking-widest ${frame.title}`}>
              {result.detail}
            </p>

            <div className="mt-3.5 space-y-2 text-left">
              {result.type === "win" ? (
                <>
                  <Row label="Win · 2× bet">
                    {result.bet * 2} <MiniChipIcon size={11} /> →
                    <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain" />
                    {winTokens}
                  </Row>
                  {bonus > 0 && (
                    <Row label="Blackjack bonus" bonus>
                      +{bonus}
                      <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain" />
                      tokens
                    </Row>
                  )}
                </>
              ) : result.type === "push" ? (
                <Row label="Push · chips returned">{result.chipRefund} <MiniChipIcon size={11} /></Row>
              ) : (
                <Row label="Round lost">−{result.bet} <MiniChipIcon size={11} /></Row>
              )}
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60">
                {result.type === "win" ? "Total credited" : result.type === "push" ? "Refunded" : "Chips lost"}
              </span>
              <span
                className={`flex items-center gap-1 text-lg font-black tabular-nums ${
                  result.type === "win" ? "text-amber-300" : result.type === "push" ? "text-slate-200" : "text-rose-300"
                }`}
              >
                {result.type === "win" ? (
                  <>
                    +{result.tokenWin}
                    <img src={TOKEN_IMG} alt="tokens" className="w-4 h-4 object-contain" />
                  </>
                ) : result.type === "push" ? (
                  <>
                    {result.chipRefund}
                    <MiniChipIcon size={14} />
                  </>
                ) : (
                  <>
                    −{result.bet}
                    <MiniChipIcon size={14} />
                  </>
                )}
              </span>
            </div>

            {aiResult && showAi && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/50">
                Player 2 · {aiResult.detail}
              </p>
            )}

            <button
              onClick={onNewRound}
              className="mt-4 w-full py-2.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-widest border border-amber-300 hover:brightness-105 transition"
            >
              New Round
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}