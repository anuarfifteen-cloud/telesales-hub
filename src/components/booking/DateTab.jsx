import { formatDate } from "@/lib/slots";

export default function DateTab({ dateStr, isSelected, onClick }) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const num = d.getDate();
  const mon = d.toLocaleDateString("en-US", { month: "short" });

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-2.5 rounded-xl transition-all font-inter ${
        isSelected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-card text-muted-foreground hover:bg-secondary border border-border"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wider">{day}</span>
      <span className="text-lg font-bold leading-tight">{num}</span>
      <span className="text-xs">{mon}</span>
    </button>
  );
}