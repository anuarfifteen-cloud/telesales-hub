import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PICKUP_TIMES } from "@/lib/workspaceTemplates";
import { INPUT } from "./workspaceStyles";

/** Pick-Up Time: pop-out, scrollable list of every 30-minute slot (12-hour). */
export default function TimeSlotPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);

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
      <PopoverContent align="start" className="w-40 p-1">
        <div className="max-h-64 overflow-y-auto">
          {PICKUP_TIMES.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                time === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
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