import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";

const TOKEN_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

// 20% of the transferred amount is burned (removed from circulation); the
// remaining 80% lands in the player's early-access tokens.
const FEE_PCT = 0.2;
const MIN_TRANSFER = 10;

export default function Game21CashOutModal({ user, open, onClose, onUserUpdate }) {
  const [busy, setBusy] = useState(false);

  const wallet = Number(user?.game21Balance) || 0;
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const receive = Math.floor(wallet * (1 - FEE_PCT));
  const fee = wallet - receive;
  const canCashOut = wallet >= MIN_TRANSFER;

  const handleConfirm = async () => {
    if (busy) return;
    if (!canCashOut) {
      toast.error(`Need at least ${MIN_TRANSFER} in your 21 Wallet to cash out.`);
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe({
        game21Balance: 0,
        earlyAccessTokens: tokens + receive,
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: userName,
        amount: receive,
        source: `21 Wallet Cash Out (−${fee} burned · 20% fee)`,
        timestamp: new Date().toISOString(),
      });
      await onUserUpdate?.();
      toast.success(`Cashed out ${receive} tokens · ${fee} burned.`);
      onClose();
    } catch (e) {
      toast.error("Cash out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-emerald-400/30 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-black uppercase tracking-widest text-amber-300 text-sm">
                  21 Wallet → Tokens
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-emerald-950/50 border border-emerald-400/20 text-emerald-100/70 hover:text-white transition"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>

            {/* Balance row */}
            <div className="flex items-center justify-center gap-3 px-5 pb-3">
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30">
                <img src={TOKEN_IMG} alt="21 Wallet" className="w-3 h-3 object-contain" />
                <span className="text-amber-200 font-bold text-xs tabular-nums">{wallet} 21</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30">
                <img src={TOKEN_IMG} alt="tokens" className="w-3 h-3 object-contain" />
                <span className="text-amber-300 font-bold text-xs tabular-nums">{tokens}</span>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 text-center px-5 pb-3">
              Transfer your whole 21 Wallet · 20% fee burned
            </p>

            {/* Breakdown */}
            <div className="px-5 space-y-2">
              <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-emerald-950/30 border border-emerald-400/20">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/70">
                  21 Wallet
                </span>
                <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
                  {wallet}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-rose-950/30 border border-rose-400/20">
                <span className="text-[11px] font-bold uppercase tracking-widest text-rose-200/80">
                  Burned fee (20%)
                </span>
                <span className="flex items-center gap-1 text-rose-300 font-black text-sm tabular-nums">
                  −{fee}
                  <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain" />
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-amber-400/10 border border-amber-400/40">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
                  You receive
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-black text-base tabular-nums">
                  +{receive}
                  <img src={TOKEN_IMG} alt="" className="w-3.5 h-3.5 object-contain" />
                </span>
              </div>
            </div>

            {/* Confirm */}
            <div className="px-5 pb-5 pt-4">
              <button
                onClick={handleConfirm}
                disabled={busy || !canCashOut}
                className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 disabled:opacity-40 hover:brightness-105 transition flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Cash Out ${receive}`}
              </button>
              {!canCashOut && (
                <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                  Need at least {MIN_TRANSFER} to cash out
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}