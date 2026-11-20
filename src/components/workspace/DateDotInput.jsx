import { useEffect, useState } from "react";
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

/** Date field typed and shown as DD.MM.YYYY, while the stored value stays ISO. */
export default function DateDotInput({ value, onChange, label }) {
  const [text, setText] = useState(() => formatDotDate(value));

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

  return (
    <input
      value={text}
      onChange={handleChange}
      placeholder="DD.MM.YYYY"
      inputMode="numeric"
      aria-label={label}
      className={INPUT}
    />
  );
}