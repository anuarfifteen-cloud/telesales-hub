import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { SLOTS } from "@/lib/slots";

export default function MySchedule({ bookings, selectedDate }) {
  // For each slot, find who booked it (could be multiple for slots with maxBookings > 1)
  const slotRows = SLOTS.flatMap((slot) => {
    const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
    if (slotBookings.length === 0) {
      return [{ slot, booking: null }];
    }
    return slotBookings.map((booking) => ({ slot, booking }));
  });

  const isAM = (shift) => shift === "AM";

  return (
    <section className="rounded-xl border border-primary/20 bg-accent p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck className="w-4 h-4 text-accent-foreground" />
        <p className="text-sm font-semibold text-accent-foreground">Daily Master Schedule</p>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence>
          {slotRows.map(({ slot, booking }, idx) => {
            const am = isAM(slot.shift);
            return (
              <motion.div
                key={slot.id + (booking?.id || "empty-" + idx)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${am ? "bg-amber-400" : "bg-violet-400"}`} />
                  <span className="text-xs font-semibold text-foreground truncate">{slot.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${am ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                    {slot.shift}
                  </span>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {booking ? (
                    <span className="text-xs font-medium text-foreground">
                      {booking.user_name || booking.user_email?.split("@")[0]}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Available
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}