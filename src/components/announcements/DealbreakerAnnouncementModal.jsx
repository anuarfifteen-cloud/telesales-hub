import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Sparkles } from "lucide-react";

/**
 * One-time "Introducing Dealbreaker" announcement.
 *
 * Styled entirely from theme tokens (card / foreground / primary / border), so
 * it inherits Default, Lilac and Royal Batik navy-gold without extra rules.
 */
export default function DealbreakerAnnouncementModal({ open, onClose, onTry }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(5,3,8,0.82)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card px-6 pb-5 pt-6 text-center text-card-foreground shadow-2xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>

            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              New Arcade Game
            </span>

            <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
              Introducing Dealbreaker!
            </h2>

            <p className="mx-auto mt-2 max-w-[19rem] text-[12px] leading-relaxed text-muted-foreground">
              Stake your chips, pick your lucky folder and beat the VIP Client's buyout
              offer — cash out early, or risk it all for the prize behind your folder.
            </p>

            <button
              type="button"
              onClick={onTry}
              className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-95 active:scale-[0.99]"
            >
              Try Dealbreaker Now
            </button>

            <button
              type="button"
              onClick={onClose}
              className="mt-1.5 w-full rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Maybe Later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}