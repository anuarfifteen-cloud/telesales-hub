export default function FlipStats({ wins, losses, streak, streakType, tokens }) {
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Wins", value: wins, color: "text-emerald-500" },
        { label: "Losses", value: losses, color: "text-red-500" },
        { label: "Win Rate", value: total > 0 ? `${winRate}%` : "—", color: "text-blue-500" },
        {
          label: "Streak",
          value: streak > 0 ? `${streak}${streakType === "win" ? "W" : "L"}` : "—",
          color: streakType === "win" ? "text-amber-500" : "text-slate-500",
        },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="bg-white dark:bg-card rounded-xl border border-border p-2 flex flex-col items-center gap-0.5"
        >
          <span className={`text-lg font-black ${color}`}>{value}</span>
          <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}