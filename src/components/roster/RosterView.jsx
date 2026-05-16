import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayInBrunei } from "@/lib/slots";
import { ClipboardList } from "lucide-react";

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ShiftCard({ emoji, title, subtitle, entries, color }) {
  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${color.bg} ${color.border}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className={`font-bold text-sm ${color.title}`}>{title}</p>
          <p className={`text-xs ${color.sub}`}>{subtitle}</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No staff assigned</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
              <span className="text-sm font-semibold text-slate-800">{e.employee_name || `Employee ${e.employee_number}`}</span>
              {e.daily_task && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.badge}`}>
                  {e.daily_task}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OffDayCard({ entries }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🌴</span>
        <div>
          <p className="font-bold text-sm text-slate-700">Off Day</p>
          <p className="text-xs text-slate-400">Resting today</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No one off today</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map((e, i) => (
            <span key={i} className="text-xs font-medium bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full">
              {e.employee_name || `Employee ${e.employee_number}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RosterView() {
  const today = todayInBrunei();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["roster", today],
    queryFn: () => base44.entities.RosterDatabase.filter({ date: today }),
  });

  const amEntries  = entries.filter((e) => e.shift_type === "AM");
  const pmEntries  = entries.filter((e) => e.shift_type === "PM");
  const offEntries = entries.filter((e) => e.shift_type === "Off");
  const hasData    = entries.length > 0;

  return (
    <div className="space-y-5">
      {/* Date header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Today's Roster</p>
        <h2 className="text-base font-bold text-foreground">{formatFullDate(today)}</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
          <p className="font-semibold text-slate-500">No roster uploaded for this date yet.</p>
          <p className="text-xs text-slate-400">Ask your admin to upload the monthly CSV.</p>
        </div>
      ) : (
        <>
          <ShiftCard
            emoji="🌅"
            title="AM Shift"
            subtitle="9:00 AM – 6:00 PM"
            entries={amEntries}
            color={{
              bg: "bg-amber-50",
              border: "border-amber-200",
              title: "text-amber-800",
              sub: "text-amber-500",
              badge: "bg-amber-100 text-amber-700",
            }}
          />
          <ShiftCard
            emoji="🌆"
            title="PM Shift"
            subtitle="1:00 PM – 9:00 PM"
            entries={pmEntries}
            color={{
              bg: "bg-violet-50",
              border: "border-violet-200",
              title: "text-violet-800",
              sub: "text-violet-500",
              badge: "bg-violet-100 text-violet-700",
            }}
          />
          <OffDayCard entries={offEntries} />
        </>
      )}
    </div>
  );
}