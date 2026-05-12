import { motion } from "framer-motion";
import { Users, CheckCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SlotCard({
  slot,
  bookedCount,
  myBooking,
  onBook,
  onCancel,
  bookingOpen,
  loading,
}) {
  const isFull = bookedCount >= slot.maxBookings;
  const isAM = slot.shift === "AM";

  const shiftBg = isAM
    ? "bg-amber-50 border-amber-200"
    : "bg-violet-50 border-violet-200";
  const shiftBadge = isAM
    ? "bg-amber-100 text-amber-700"
    : "bg-violet-100 text-violet-700";
  const shiftDot = isAM ? "bg-amber-400" : "bg-violet-400";

  let statusContent;
  if (!bookingOpen) {
    statusContent = (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <span>Opens 7:30 PM today</span>
      </div>
    );
  } else if (myBooking) {
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
          <p className="font-semibold text-sm text-foreground truncate">
            {slot.label}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
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