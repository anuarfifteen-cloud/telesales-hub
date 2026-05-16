import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayInBrunei } from "@/lib/slots";
import { ClipboardList, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EMPLOYEES = [
  { value: 1, label: "Aiman" }, { value: 2, label: "Adibah" },
  { value: 3, label: "Anil" }, { value: 4, label: "Nurul" },
  { value: 5, label: "Kash" }, { value: 6, label: "Salwa" },
  { value: 7, label: "Husnina" }, { value: 8, label: "Anwar" },
  { value: 9, label: "Sasha" }, { value: 10, label: "Aziemah" },
  { value: 11, label: "Kamaliah" }, { value: 12, label: "Atiqah" },
  { value: 13, label: "Halimatul" }, { value: 14, label: "Afiqah" },
];

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function ShiftCard({ emoji, title, subtitle, entries, color, isAdmin, onDelete }) {
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
              <div className="flex items-center gap-2">
                {e.daily_task && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.badge}`}>
                    {e.daily_task}
                  </span>
                )}
                {isAdmin && (
                  <button onClick={() => onDelete(e.id)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OffDayCard({ entries, isAdmin, onDelete }) {
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
            <div key={i} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-slate-600">{e.employee_name || `Employee ${e.employee_number}`}</span>
              {isAdmin && (
                <button onClick={() => onDelete(e.id)} className="text-red-400 hover:text-red-600 ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RosterView({ isAdmin = false }) {
  const today = todayInBrunei();
  const queryClient = useQueryClient();
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [qaForm, setQaForm] = useState({ date: today, employee: "", shift: "", task: "" });
  const [qaSaving, setQaSaving] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["roster", today],
    queryFn: () => base44.entities.RosterDatabase.filter({ date: today }),
  });

  const amEntries  = entries.filter((e) => e.shift_type === "AM");
  const pmEntries  = entries.filter((e) => e.shift_type === "PM");
  const offEntries = entries.filter((e) => e.shift_type === "Off");
  const hasData    = entries.length > 0;

  const handleDelete = async (id) => {
    await base44.entities.RosterDatabase.delete(id);
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Entry removed.");
  };

  const handleQuickAssign = async () => {
    if (!qaForm.date || !qaForm.employee || !qaForm.shift) {
      toast.error("Please fill in date, employee and shift.");
      return;
    }
    setQaSaving(true);
    const emp = EMPLOYEES.find(e => String(e.value) === qaForm.employee);
    await base44.entities.RosterDatabase.create({
      date: qaForm.date,
      shift_type: qaForm.shift,
      employee_number: emp.value,
      employee_name: emp.label,
      daily_task: qaForm.task,
    });
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Assignment saved!");
    setQaForm({ date: today, employee: "", shift: "", task: "" });
    setShowQuickAssign(false);
    setQaSaving(false);
  };

  return (
    <div className="space-y-5 pb-20">
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
            emoji="🌅" title="AM Shift" subtitle="9:00 AM – 6:00 PM"
            entries={amEntries} isAdmin={isAdmin} onDelete={handleDelete}
            color={{ bg: "bg-amber-50", border: "border-amber-200", title: "text-amber-800", sub: "text-amber-500", badge: "bg-amber-100 text-amber-700" }}
          />
          <ShiftCard
            emoji="🌆" title="PM Shift" subtitle="1:00 PM – 9:00 PM"
            entries={pmEntries} isAdmin={isAdmin} onDelete={handleDelete}
            color={{ bg: "bg-violet-50", border: "border-violet-200", title: "text-violet-800", sub: "text-violet-500", badge: "bg-violet-100 text-violet-700" }}
          />
          <OffDayCard entries={offEntries} isAdmin={isAdmin} onDelete={handleDelete} />
        </>
      )}

      {/* Quick Assign floating button + form (admin only) */}
      {isAdmin && (
        <div className="fixed bottom-20 right-4 z-30">
          {showQuickAssign ? (
            <div className="bg-white rounded-2xl border border-border shadow-xl p-4 w-72 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-800">Quick Assign</span>
                <button onClick={() => setShowQuickAssign(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
              <input type="date" value={qaForm.date} onChange={e => setQaForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <select value={qaForm.employee} onChange={e => setQaForm(f => ({ ...f, employee: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select employee</option>
                {EMPLOYEES.map(emp => <option key={emp.value} value={String(emp.value)}>{emp.value}. {emp.label}</option>)}
              </select>
              <select value={qaForm.shift} onChange={e => setQaForm(f => ({ ...f, shift: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select shift</option>
                <option value="AM">AM Shift</option>
                <option value="PM">PM Shift</option>
                <option value="Off">OFF Day</option>
              </select>
              <input type="text" value={qaForm.task} onChange={e => setQaForm(f => ({ ...f, task: e.target.value }))}
                placeholder="Task (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <Button className="w-full h-9 text-sm font-semibold" onClick={handleQuickAssign} disabled={qaSaving}>
                {qaSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <button onClick={() => setShowQuickAssign(true)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}