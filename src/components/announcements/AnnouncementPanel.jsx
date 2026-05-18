import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function isActive(announcement) {
  return Date.now() - new Date(announcement.created_date).getTime() < TWENTY_FOUR_HOURS;
}

export default function AnnouncementPanel({ announcements, onClose }) {
  const active = announcements.filter(isActive).sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Announcements</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <Megaphone className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-muted-foreground">No active announcements</p>
                <p className="text-xs text-muted-foreground">Check back later</p>
              </div>
            ) : (
              active.map(a => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 space-y-1"
                >
                  <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{a.message}</p>
                  <div className="flex items-center justify-between">
                    {a.created_by_name && (
                      <span className="text-[10px] text-muted-foreground font-medium">— {a.created_by_name}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

}