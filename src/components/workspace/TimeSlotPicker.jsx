import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PICKUP_MERIDIEMS,
  formatPickupTime,
  pickupTimesFor,
} from "@/lib/workspaceTemplates";
import { INPUT } from "./workspaceStyles";

/** "9:00 PM" → { time: "9:00", meridiem: "PM" }, or nulls while empty. */
function splitTime(value) {
  const match = /^(\d{1,2}:\d{2})\s*(AM|PM)$/i.exec(String(value || "").trim());
  if (!match) return { time: "", meridiem: "AM" };
  return { time: match[1], meridiem: match[2].toUpperCase() };
}

/**
 * Pick-Up Time: a scrollable list of 30-minute slots for the chosen period,
 * plus a separate AM/PM toggle. Only 9:00 AM through 11:30 PM are offered.
 */
export default function TimeSlotPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [meridiem, setMeridiem] = useState(() => splitTime(value).meridiem);

  useEffect(() => {
    const next = splitTime(value).meridiem;
    if (value) setMeridiem(next);
  }, [value]);

  const selected = splitTime(value).time;
  const times = pickupTimesFor(meridiem);

  const chooseMeridiem = (next) => {
    setMeridiem(next);
    if (!selected) return;
    // Keep the same clock time when it exists in the other period, else clear it.
    onChange(pickupTimesFor(next).includes(selected) ? formatPickupTime(selected, next) : "");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`${INPUT} flex items-center justify-between gap-2 text-left`}
        >
          <span className={value ? "" : "text-muted-foreground"}>{value || "Select time"}</span>
          <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-2">
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {PICKUP_MERIDIEMS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => chooseMeridiem(option)}
              aria-pressed={meridiem === option}
              className={`rounded-lg py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition ${
                meridiem === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="max-h-52 overflow-y-auto">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(formatPickupTime(time, meridiem));
                setOpen(false);
              }}
              className={`flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                time === selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}