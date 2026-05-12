import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck } from "lucide-react";

export default function MySchedule({ myBookings }) {
  // myBookings: array of { date, slot_label, shift, slot_id }
  const sorted = [...myBookings].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="rounded-xl border border-primary/20 bg-accent p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck className="w-4 h-4 text-accent-foreground" />
        <p className="text-sm font-semibold text-accent-foreground">My Real-Time Schedule</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No bookings yet for the upcoming week.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sorted.map((b) => {
              const isAM = b.shift === "AM";
              return (
                <motion.div
                  key={b.date + b.slot_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAM ? "bg-amber-400" : "bg-violet-400"}`} />
                    <span className="text-xs font-semibold text-foreground">{b.slot_label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${isAM ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                      {b.shift}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}