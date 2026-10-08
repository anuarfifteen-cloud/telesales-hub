import { motion } from "framer-motion";
import { X } from "lucide-react";
import BlackjackGuideContent from "./BlackjackGuideContent";

/**
 * "How to Play & FAQ" overlay for Blackjack 21. Sits above the Cashier overlay
 * (z-80 vs z-70) so it can be opened from the game header or from inside the
 * Cashier without either one closing underneath.
 */
export default function BlackjackHowToPlayModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="blackjack-guide w-full max-w-sm max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          border: "2px solid rgba(212,175,55,0.45)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 pt-4 pb-3"
          style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.22), transparent)", borderBottom: "1px solid rgba(212,175,55,0.3)" }}
        >
          <div>
            <p className="text-[13px] font-black uppercase tracking-widest text-amber-300">
              🎰 Blackjack 21
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
              Quick Guide &amp; Rules
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full bg-emerald-950/60 border border-amber-400/30 text-amber-200 hover:text-white transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guide sections */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <BlackjackGuideContent />
        </div>

        <div className="px-5 pb-4 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 hover:brightness-105 transition"
          >
            Got it — Let's Play
          </button>
        </div>
      </motion.div>
    </div>
  );
}