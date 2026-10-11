import { motion, AnimatePresence } from "framer-motion";
import MiniChipIcon from "../MiniChipIcon";
import { Check, X, LogOut } from "lucide-react";

// Centered modal shown to non-host seated players after the host initiates
// Play Again. The player accepts (joins the same-wager round), declines (sits
// this one out), or leaves the table entirely. Non-response by the deadline
// counts as a decline. Once every seated non-host has responded, the host
// engine starts the round immediately — no second confirmation.
export default function MpReplayPrompt({
  show = false,
  wager = 0,
  secondsLeft = null,
  responded = false,
  onAccept,
  onDecline,
  onLeave,
  busy = false,
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <motion.div
            initial={{ scale: 0.7, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="relative w-full max-w-xs rounded-3xl border-2 border-amber-300 px-6 py-7 text-center overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 100%)",
              boxShadow: "0 0 32px rgba(212,175,55,0.5)",
            }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20"
              style={{ background: "#d4af37" }}
            />

            {responded ? (
              <div className="flex flex-col items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
                  Response sent — waiting for the host to start…
                </p>
              </div>
            ) : (
              <>
                <p className="text-xl font-black uppercase tracking-widest text-amber-200">
                  Host wants a rematch
                </p>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-amber-200 font-black text-lg tabular-nums">
                  <MiniChipIcon size={18} /> {wager} chips
                </p>
                {secondsLeft !== null && secondsLeft > 0 && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-200/60 tabular-nums">
                    Respond in {secondsLeft}s
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <button
                    onClick={onAccept}
                    disabled={busy}
                    className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
                    style={{ background: "#d4af37" }}
                  >
                    <Check className="inline mr-1 w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={onDecline}
                    disabled={busy}
                    className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-rose-50 bg-rose-700/60 border border-rose-400/40 disabled:opacity-40 transition"
                  >
                    <X className="inline mr-1 w-4 h-4" /> Decline
                  </button>
                </div>
                <button
                  onClick={onLeave}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-100/60 hover:text-emerald-50 transition disabled:opacity-40"
                >
                  <LogOut className="w-3 h-3" /> Leave Table
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}