import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDotDate } from "@/lib/workspaceTemplates";
import { INPUT } from "./workspaceStyles";

/** DD.MM.YYYY text → ISO date (YYYY-MM-DD), or null while incomplete/invalid. */
function toIso(text) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ISO date (YYYY-MM-DD) → a local Date, or undefined when there is none. */
function fromIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Date field typed as DD.MM.YYYY (stored ISO), with a calendar popup picker. */
export default function DateDotInput({ value, onChange, label }) {
  const [text, setText] = useState(() => formatDotDate(value));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(formatDotDate(value));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    if (!raw.trim()) {
      onChange("");
      return;
    }
    const iso = toIso(raw);
    if (iso) onChange(iso);
  };

  const selectedDate = fromIso(value);

  return (
    <div className="relative">
      <input
        value={text}
        onChange={handleChange}
        placeholder="DD.MM.YYYY"
        inputMode="numeric"
        aria-label={label}
        className={`${INPUT} pr-11`}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Pick ${label}`}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              setOpen(false);
              onChange(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                  date.getDate()
                ).padStart(2, "0")}`
              );
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}