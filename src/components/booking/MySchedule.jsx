import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { SLOTS } from "@/lib/slots";

function SlotRow({ slot, bookings }) {
  const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
  const remaining = slot.maxBookings - slotBookings.length;
  const isAM = slot.shift === "AM";

  const items = [
    ...slotBookings.map((b) => ({ type: "booked", name: b.user_name || b.user_email?.split("@")[0], booked_at: b.booked_at })),
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
            <div key={idx} className="flex flex-col items-start bg-secondary px-2 py-1 rounded-md min-w-0">
              <span className="text-xs font-medium text-foreground break-words whitespace-normal">
                {item.name}
              </span>
              {item.booked_at && (
                <span className="text-xs text-gray-500 break-words whitespace-normal">
                  Booked at {item.booked_at}
                </span>
              )}
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

function ShiftSection({ label, emoji, slots, bookings }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{emoji}</span>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} bookings={bookings} />
        ))}
      </div>
    </div>
  );
}

export default function MySchedule({ bookings }) {
  const amSlots = SLOTS.filter((s) => s.shift === "AM");
  const pmSlots = SLOTS.filter((s) => s.shift === "PM");

  return (
    <section className="rounded-xl border border-primary/20 bg-accent p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-accent-foreground" />
        <p className="text-sm font-semibold text-accent-foreground">Daily Master Schedule</p>
      </div>
      <ShiftSection label="AM Shift" emoji="🌤" slots={amSlots} bookings={bookings} />
      <ShiftSection label="PM Shift" emoji="🌆" slots={pmSlots} bookings={bookings} />
    </section>
  );
}