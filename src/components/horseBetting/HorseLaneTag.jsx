/**
 * A lane entry as a clean white capsule: coloured number disc + horse name.
 * Used both as the read-only lane list under the race and as the pickable
 * horse selector on the bet slip.
 */
export default function HorseLaneTag({ horse, active = false, winner = false, onClick, className = "" }) {
  const Tag = onClick ? "button" : "div";
  const ring = winner
    ? "ring-2 ring-amber-400 ring-offset-1"
    : active
      ? "ring-2 ring-amber-400"
      : "";

  return (
    <Tag
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`flex w-full items-center gap-1.5 rounded-full border border-white bg-white px-1.5 py-1.5 text-left shadow-[0_2px_7px_rgba(15,23,42,0.12)] transition-all ${
        onClick ? "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.16)]" : ""
      } ${ring} ${className}`}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-sm"
        style={{ backgroundColor: horse?.color || "#94a3b8" }}
      >
        {horse?.number ?? "?"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-slate-700">
        {horse?.name || "Unknown"}
      </span>
    </Tag>
  );
}