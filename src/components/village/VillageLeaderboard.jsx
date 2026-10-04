import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy } from "lucide-react";

// Team rankings — score = quests completed × 100, buildings as the tiebreak.
export default function VillageLeaderboard({ user }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["villageLeaderboard"],
    queryFn: () => base44.entities.VillageLeaderboard.list("-score", 20),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-12 text-center">
        <Trophy className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold text-foreground">No villages founded yet</p>
        <p className="text-xs text-muted-foreground">Be the first to build.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Village Rankings ({data.length})
        </p>
      </div>
      <div className="divide-y divide-border">
        {data.map((row, i) => {
          const isMe = row.user_id === user?.id;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <div
              key={row.user_id || row.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-emerald-500/10" : ""}`}
            >
              <span className="flex w-7 justify-center text-sm font-black text-muted-foreground tabular-nums">
                {medal || i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.user_name}
                  {isMe && <span className="ml-1.5 text-[10px] font-bold text-emerald-600">YOU</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {row.quests_done || 0} quests · {row.buildings_count || 0} buildings
                </p>
              </div>
              <span className="flex-shrink-0 text-sm font-black text-foreground tabular-nums">
                {row.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}