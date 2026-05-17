import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayInBrunei } from "@/lib/slots";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
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

// Generate a consistent hue from a name string
function nameToHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function Avatar({ name }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const hue = nameToHue(name);
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: `hsl(${hue}, 60%, 52%)` }}
    >
      {initials}
    </div>
  );
}

// Map task keywords to badge color classes
const TASK_COLORS = [
  { match: /inbound/i,       bg: "bg-green-100",   text: "text-green-800"   },
  { match: /outbound/i,      bg: "bg-blue-100",    text: "text-blue-800"    },
  { match: /chat/i,          bg: "bg-cyan-100",    text: "text-cyan-800"    },
  { match: /upsell/i,        bg: "bg-purple-100",  text: "text-purple-800"  },
  { match: /yayasan/i,       bg: "bg-orange-100",  text: "text-orange-800"  },
  { match: /simpack/i,       bg: "bg-violet-100",  text: "text-violet-800"  },
  { match: /online.order/i,  bg: "bg-amber-100",   text: "text-amber-900"   },
  { match: /mb\b|mobile.bundle/i, bg: "bg-teal-100", text: "text-teal-800"  },
  { match: /bundle/i,        bg: "bg-indigo-100",  text: "text-indigo-800"  },
  { match: /pl\b/i,          bg: "bg-pink-100",    text: "text-pink-800"    },
  { match: /al\b/i,          bg: "bg-red-100",     text: "text-red-800"     },
  { match: /lead/i,          bg: "bg-emerald-100", text: "text-emerald-800" },
];

function taskBadgeColor(task) {
  if (!task) return { bg: "bg-slate-100", text: "text-slate-500" };
  const match = TASK_COLORS.find(c => c.match.test(task));
  return match || { bg: "bg-slate-100", text: "text-slate-600" };
}

const AM_SLOTS = 5;
const PM_SLOTS = 5;
const OFF_SLOTS = 4;

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function EntryRow({ entry, shiftColor, isAdmin, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const isEmpty = !entry;
  const name = entry?.employee_name || `Employee ${entry?.employee_number}`;
  const task = entry?.daily_task || "";
  const caption = entry?.caption || "";

  const startEdit = () => {
    setEditName(name);
    setEditTask(task);
    setEditCaption(caption);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.RosterDatabase.update(entry.id, {
      employee_name: editName,
      daily_task: editTask,
      caption: editCaption,
    });
    onUpdate();
    setSaving(false);
    setEditing(false);
    toast.success("Entry updated.");
  };

  if (isEmpty) {
    return (
      <div className="flex items-center px-2 py-1 rounded-lg bg-white/40 border border-dashed border-slate-200">
        <span className="text-[11px] italic text-slate-300">Empty</span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-white border border-blue-200 shadow-sm">
        <input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="Employee name"
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          value={editTask}
          onChange={e => setEditTask(e.target.value)}
          placeholder="Task (optional)"
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          value={editCaption}
          onChange={e => setEditCaption(e.target.value)}
          placeholder="Caption (optional, e.g. Seat 3, Ext. 101)"
          className="w-full text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-500"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <button onClick={saveEdit} disabled={saving} className="text-blue-500 hover:text-blue-700 transition-colors">
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const badge = taskBadgeColor(task);

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/80 border border-white shadow-sm gap-2">
      {/* Avatar + Name + caption */}
      <div className="flex items-center gap-2 min-w-0">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{name}</p>
          {caption && <p className="text-[9px] text-slate-400 leading-none truncate mt-0.5">{caption}</p>}
        </div>
      </div>

      {/* Task badge + admin actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task ? (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
            {task}
          </span>
        ) : (
          <span className="text-[10px] italic text-slate-300">—</span>
        )}
        {isAdmin && (
          <>
            <button onClick={startEdit} className="text-slate-300 hover:text-blue-500 transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ShiftCard({ emoji, title, subtitle, entries, slotCount, color, isAdmin, onDelete, onUpdate }) {
  const rows = Array.from({ length: slotCount }, (_, i) => entries[i] || null);

  return (
    <div className={`rounded-xl border px-3 pt-2 pb-2.5 ${color.bg} ${color.border}`}>
      {/* Compact inline header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{emoji}</span>
        <span className={`text-xs font-bold ${color.title}`}>{title}</span>
        <span className={`text-[10px] ${color.sub}`}>· {subtitle}</span>
      </div>
      <div className="space-y-1">
        {rows.map((entry, i) => (
          <EntryRow
            key={entry?.id || `empty-${i}`}
            entry={entry}
            shiftColor={color}
            isAdmin={isAdmin}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function OffDayCard({ entries, isAdmin, onDelete, onUpdate }) {
  const rows = Array.from({ length: OFF_SLOTS }, (_, i) => entries[i] || null);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 pt-2 pb-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">🌴</span>
        <span className="text-xs font-bold text-slate-600">Off Day</span>
        <span className="text-[10px] text-slate-400">· Resting today</span>
      </div>
      <div className="space-y-1">
        {rows.map((entry, i) => (
          <EntryRow
            key={entry?.id || `off-empty-${i}`}
            entry={entry}
            shiftColor={{ taskBg: "bg-slate-100", taskText: "text-slate-600" }}
            isAdmin={isAdmin}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function getRosterDates() {
  const today = todayInBrunei();
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: 4 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    return dt.toISOString().slice(0, 10);
  });
}

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: dt.toLocaleDateString("en-US", { weekday: "short" }),
    date: dt.getDate(),
    isToday: dateStr === todayInBrunei(),
  };
}

export default function RosterView({ isAdmin = false }) {
  const today = todayInBrunei();
  const rosterDates = getRosterDates();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [qaForm, setQaForm] = useState({ date: today, employee: "", shift: "", task: "", caption: "" });
  const [qaSaving, setQaSaving] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["roster", selectedDate],
    queryFn: () => base44.entities.RosterDatabase.filter({ date: selectedDate }),
  });

  const amEntries  = entries.filter((e) => e.shift_type === "AM");
  const pmEntries  = entries.filter((e) => e.shift_type === "PM");
  const offEntries = entries.filter((e) => e.shift_type === "Off");

  const handleDelete = async (id) => {
    await base44.entities.RosterDatabase.delete(id);
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Entry removed.");
  };

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["roster"] });
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
      caption: qaForm.caption,
    });
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Assignment saved!");
    setQaForm({ date: today, employee: "", shift: "", task: "", caption: "" });
    setShowQuickAssign(false);
    setQaSaving(false);
  };

  return (
    <div className="space-y-2.5 pb-20">
      {/* Date picker */}
      <div className="grid grid-cols-4 gap-1.5">
        {rosterDates.map((d) => {
          const { day, date, isToday } = formatShortDate(d);
          const isSelected = d === selectedDate;
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center py-2 rounded-xl text-sm font-semibold transition-all border ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow"
                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{day}</span>
              <span className="text-base font-bold leading-tight">{date}</span>
              {isToday && <span className={`text-[9px] mt-0.5 ${isSelected ? "text-blue-200" : "text-blue-500"}`}>Today</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 -mt-1">{formatFullDate(selectedDate)}</p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <ShiftCard
            emoji="🌅" title="AM Shift" subtitle="9:00 AM – 6:00 PM"
            entries={amEntries} slotCount={AM_SLOTS} isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate}
            color={{ bg: "bg-amber-50", border: "border-amber-200", title: "text-amber-800", sub: "text-amber-500", taskBg: "bg-amber-100", taskText: "text-amber-800" }}
          />
          <ShiftCard
            emoji="🌆" title="PM Shift" subtitle="1:00 PM – 9:00 PM"
            entries={pmEntries} slotCount={PM_SLOTS} isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate}
            color={{ bg: "bg-violet-50", border: "border-violet-200", title: "text-violet-800", sub: "text-violet-500", taskBg: "bg-violet-100", taskText: "text-violet-800" }}
          />
          <OffDayCard entries={offEntries} isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate} />
        </>
      )}

      {isAdmin && (
        <div className="fixed bottom-20 right-4 z-30">
          {showQuickAssign ? (
            <div className="bg-white rounded-2xl border border-border shadow-xl p-4 w-72 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-800">Quick Assign</span>
                <button onClick={() => setShowQuickAssign(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
              <input type="date" value={qaForm.date || selectedDate} onChange={e => setQaForm(f => ({ ...f, date: e.target.value }))}
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
              <input type="text" value={qaForm.caption} onChange={e => setQaForm(f => ({ ...f, caption: e.target.value }))}
                placeholder="Caption (optional, e.g. Seat 3)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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