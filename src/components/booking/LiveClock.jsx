import { useBruneiClock } from "@/hooks/useBruneiClock";
import { format } from "date-fns-tz";

const TZ = "Asia/Brunei";

export default function LiveClock() {
  const now = useBruneiClock();

  const datePart = format(now, "EEEE, d MMMM yyyy", { timeZone: TZ });
  const timePart = format(now, "hh:mm aa", { timeZone: TZ });

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{datePart}</span>
      <span className="text-sm font-bold tabular-nums text-primary">{timePart}</span>
      <span className="text-xs text-muted-foreground font-medium">Brunei Time</span>
    </div>
  );
}