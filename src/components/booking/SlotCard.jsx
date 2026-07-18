import { motion } from "framer-motion";
import { Users, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatCountdown(ms) {
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  if (d >= 1) return `${d}D ${h}h ${String(m).padStart(2, "0")}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function SlotCard({
  slot,
  bookedCount,
  myBooking,
  onBook,
  onCancel,
  unlockTime, // Date object: the moment booking opens
  now,        // current Brunei Date (live, from parent)
  loading,
}) {
  const isFull = bookedCount >= slot.maxBookings;
  const isAM = slot.shift === "AM";

  const shiftBg = "bg-card border-border shadow-sm";
  const shiftBadge = isAM
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
    : "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300";
  const shiftDot = isAM ? "bg-amber-400" : "bg-violet-400";

  const msUntilOpen = unlockTime - now;
  const bookingOpen = msUntilOpen <= 0;
  const countdown = !bookingOpen ? formatCountdown(msUntilOpen) : null;

  // Friday AM restricted slots: show static gender badge only, no booking UI
  if (slot.restriction) {
    const isMen = slot.restriction === "Men Only";
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${shiftBg}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${shiftDot}`} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{slot.label}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${shiftBadge}`}>
              {slot.shift} Shift
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
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

  let statusContent;
  if (myBooking) {
    statusContent = (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Your booking</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
          onClick={() => onCancel(myBooking)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    );
  } else if (!bookingOpen) {
    statusContent = (
      <Button size="sm" className="h-7 text-xs px-2 tabular-nums" disabled>
        <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
        {countdown}
      </Button>
    );
  } else if (isFull) {
    statusContent = (
      <span className="text-xs text-muted-foreground font-medium">Full</span>
    );
  } else {
    statusContent = (
      <Button
        size="sm"
        className="h-7 text-xs px-3"
        onClick={() => onBook(slot)}
        disabled={loading}
      >
        Book
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${shiftBg} ${
        myBooking ? "ring-2 ring-emerald-400 ring-offset-1" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${shiftDot}`} />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{slot.label}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${shiftBadge}`}>
              {slot.shift} Shift
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {bookedCount}/{slot.maxBookings}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">{statusContent}</div>
    </motion.div>
  );
}