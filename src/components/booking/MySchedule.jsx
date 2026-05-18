import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { SLOTS, getAmSlots, isFriday } from "@/lib/slots";

function SlotRow({ slot, bookings, globalRankMap }) {
  const isAM = slot.shift === "AM";

  // Friday restricted slot: show static gender badge only
  if (slot.restriction) {
    const isMen = slot.restriction === "Men Only";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-card rounded-lg px-3 py-2.5 border border-border gap-1.5 sm:gap-3"
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{slot.label}</span>
        </div>
        <div>
          {isMen ? (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Men Only
            </span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              Women Only
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
  const remaining = slot.maxBookings - slotBookings.length;

  const items = [
    ...slotBookings.map((b) => ({
      type: "booked",
      name: b.user_name || b.user_email?.split("@")[0],
      booked_at: b.booked_at,
      globalRank: globalRankMap[b.id],
    })),
    ...Array(Math.max(0, remaining)).fill({ type: "available" }),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between bg-card rounded-lg px-3 py-2.5 border border-border gap-1.5 sm:gap-3"
    >
      {/* Left: dot + time label */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAM ? "bg-amber-400" : "bg-violet-400"}`} />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">{slot.label}</span>
      </div>

      {/* Right: capacity items — wrap horizontally */}
      <div className="flex flex-row flex-wrap gap-1.5 items-start pl-4 sm:pl-0 sm:justify-end">
        {items.map((item, idx) =>
          item.type === "booked" ? (
            <div key={idx} className={`flex flex-col items-start px-2 py-1 rounded-md min-w-0 ${item.globalRank === 1 ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800" : "bg-secondary"}`}>
              <span className="text-xs font-semibold text-foreground break-words whitespace-normal">
                {item.name}
              </span>
              <span className={`text-[10px] leading-tight mt-0.5 font-medium ${item.globalRank === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                Daily #{item.globalRank}{item.booked_at ? ` · ${item.booked_at}` : ""}
              </span>
            </div>
          ) : (
            <span key={idx} className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              Available
            </span>
          )
        )}
      </div>
    </motion.div>
  );
}

function ShiftSection({ label, emoji, slots, bookings, globalRankMap }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{emoji}</span>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} bookings={bookings} globalRankMap={globalRankMap} />
        ))}
      </div>
    </div>
  );
}

export default function MySchedule({ bookings, selectedDate }) {
  const amSlots = getAmSlots(selectedDate);
  const pmSlots = SLOTS.filter((s) => s.shift === "PM");

  // Build a global daily rank map: sort ALL bookings for the day by created_date ms
  const globalRankMap = {};
  [...bookings]
    .sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime())
    .forEach((b, i) => { globalRankMap[b.id] = i + 1; });

  return (
    <section className="rounded-xl border border-primary/20 bg-accent p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-accent-foreground" />
        <p className="text-sm font-semibold text-accent-foreground">Daily Master Schedule</p>
      </div>
      <ShiftSection label="AM Shift" emoji="🌤" slots={amSlots} bookings={bookings} globalRankMap={globalRankMap} />
      <ShiftSection label="PM Shift" emoji="🌆" slots={pmSlots} bookings={bookings} globalRankMap={globalRankMap} />
    </section>
  );
}