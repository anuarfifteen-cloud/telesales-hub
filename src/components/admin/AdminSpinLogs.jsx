import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSpinLogs() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["spinLogs"],
    queryFn: () => base44.entities.SpinActivityLog.list("-created_date", 100),
  });

  const handleDelete = async (id) => {
    setDeletingId(id);
    await base44.entities.SpinActivityLog.delete(id);
    queryClient.invalidateQueries({ queryKey: ["spinLogs"] });
    queryClient.invalidateQueries({ queryKey: ["spinWinners"] });
    toast.success("Log deleted.");
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">🎡 Spin Wheel Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All spins — winners and non-winners.</p>
        </div>
        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full border border-border">
          {logs.length} records
        </span>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No spin records yet.
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="text-left px-3 py-2.5 font-semibold">User</th>
                <th className="text-left px-3 py-2.5 font-semibold">Result</th>
                <th className="text-center px-3 py-2.5 font-semibold">Winner?</th>
                <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}
                >
                  <td className="px-3 py-2.5 font-medium text-foreground">{log.user_name}</td>
                  <td className="px-3 py-2.5 text-foreground">{log.prize_text}</td>
                  <td className="px-3 py-2.5 text-center">
                    {log.is_winner ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ✅ Yes
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
                      : new Date(log.created_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
                    }
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {deletingId === log.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}