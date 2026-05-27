import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayInBrunei } from "@/lib/slots";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2, Plus, Pencil, Check, X, ChevronLeft, ChevronRight, GripVertical, Save, User as UserIcon } from "lucide-react";
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

function Avatar({ rotationNumber }) {
  return (
    <div className="w-7 h-7 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
      {rotationNumber != null ? rotationNumber : <span className="text-slate-200">—</span>}
    </div>
  );
}

const AM_DEFAULTS  = ["SIMPACK", "ONLINE ORDER", "INBOUND (MB)", "OUTBOUND", "INBOUND (MB)"];
const PM_DEFAULTS  = ["INBOUND (MB)", "UPSELLING", "OUTBOUND", "SIMPACK", "OUTBOUND"];
const OFF_DEFAULTS = ["", "", "", ""];

const TASK_COLORS = [
  { match: /simpack/i,       bg: "bg-red-600",     text: "text-white"       },
  { match: /inbound/i,       bg: "bg-green-100",   text: "text-green-800"   },
  { match: /outbound/i,      bg: "bg-blue-100",    text: "text-blue-800"    },
  { match: /chat/i,          bg: "bg-cyan-100",    text: "text-cyan-800"    },
  { match: /upsell/i,        bg: "bg-purple-100",  text: "text-purple-800"  },
  { match: /yayasan/i,       bg: "bg-orange-100",  text: "text-orange-800"  },
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

function formatMediumDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// Draft-mode TemplateRow: reports selection changes upward, no per-row save button
function TemplateRow({ slotIndex, defaultTask, isAdmin, pendingEmp, onPendingChange, userRotationMap }) {
  const [editingTask, setEditingTask] = useState(false);
  const [taskVal, setTaskVal] = useState(defaultTask);
  const badge = taskBadgeColor(taskVal);

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/40 dark:bg-slate-700/30 border border-dashed border-slate-200 dark:border-slate-600 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {pendingEmp ? (
          <Avatar rotationNumber={userRotationMap?.[EMPLOYEES.find(e => String(e.value) === pendingEmp)?.label] ?? null} />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
        {pendingEmp ? (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {EMPLOYEES.find(e => String(e.value) === pendingEmp)?.label}
          </span>
        ) : (
          <span className="text-[11px] italic text-slate-400 dark:text-slate-500">Empty</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {editingTask ? (
          <>
            <input value={taskVal} onChange={e => setTaskVal(e.target.value)}
              className="text-[10px] border border-slate-300 rounded px-1 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <button onClick={() => setEditingTask(false)} className="text-blue-500"><Check className="w-3 h-3" /></button>
          </>
        ) : (
          <span onClick={() => isAdmin && setEditingTask(true)}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} ${isAdmin ? "cursor-pointer hover:opacity-80" : ""}`}>
            {taskVal}
          </span>
        )}
        {isAdmin && (
          <select
            value={pendingEmp || ""}
            onChange={e => onPendingChange(slotIndex, e.target.value, taskVal)}
            className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:border-slate-600 focus:outline-none"
          >
            <option value="">Assign…</option>
            {EMPLOYEES.map(emp => <option key={emp.value} value={String(emp.value)}>{emp.label}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function EntryRow({ entry, isAdmin, onDelete, onUpdate, dragHandleProps, rotationNumber }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const name = entry?.employee_name || `Employee ${entry?.employee_number}`;
  const task = entry?.daily_task || "";
  const caption = entry?.caption || "";

  const startEdit = () => { setEditName(name); setEditTask(task); setEditCaption(caption); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.RosterDatabase.update(entry.id, {
      employee_name: editName, daily_task: editTask, caption: editCaption,
    });
    onUpdate(); setSaving(false); setEditing(false);
    toast.success("Entry updated.");
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-white border border-blue-200 shadow-sm">
        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Employee name"
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={editTask} onChange={e => setEditTask(e.target.value)} placeholder="Task (optional)"
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={editCaption} onChange={e => setEditCaption(e.target.value)} placeholder="Caption (optional)"
          className="w-full text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-500" />
        <div className="flex gap-2 justify-end">
          <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          <button onClick={saveEdit} disabled={saving} className="text-blue-500 hover:text-blue-700"><Check className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  const badge = taskBadgeColor(task);

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-700/60 border border-white dark:border-slate-600 shadow-sm gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {isAdmin && (
          <span {...dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
        )}
        <Avatar rotationNumber={rotationNumber ?? null} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">{name}</p>
          {caption && <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-none truncate mt-0.5">{caption}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task ? (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>{task}</span>
        ) : (
          <span className="text-[10px] italic text-slate-300">—</span>
        )}
        {isAdmin && (
          <>
            <button onClick={startEdit} className="text-slate-300 hover:text-blue-500 transition-colors"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </>
        )}
      </div>
    </div>
  );
}

function DraggableShiftList({ entries, shiftKey, isAdmin, onDelete, onUpdate, userRotationMap }) {
  return (
    <Droppable droppableId={shiftKey}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
          {entries.map((entry, i) => (
            <Draggable key={entry.id} draggableId={entry.id} index={i} isDragDisabled={!isAdmin}>
              {(prov, snapshot) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  className={snapshot.isDragging ? "opacity-80 shadow-lg" : ""}
                >
                  <EntryRow
                    entry={entry}
                    isAdmin={isAdmin}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    dragHandleProps={prov.dragHandleProps}
                    rotationNumber={userRotationMap?.[entry.employee_name] ?? null}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function ShiftCard({ emoji, title, subtitle, entries, slotCount, defaultTasks, shiftType, color, isAdmin, onDelete, onUpdate, selectedDate, userRotationMap }) {
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  // Stable slot order: sort entries by sort_order, then created_date, then id — never re-sort on save
  const stableEntries = [...entries].sort((a, b) => {
    const aO = a.sort_order ?? 9999;
    const bO = b.sort_order ?? 9999;
    if (aO !== bO) return aO - bO;
    return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
  });

  const emptyCount = Math.max(0, slotCount - stableEntries.length);
  const hasPending = Object.keys(pendingAssignments).some(k => pendingAssignments[k]?.empValue);

  const handlePendingChange = (slotIndex, empValue, task) => {
    setPendingAssignments(prev => ({
      ...prev,
      [slotIndex]: empValue ? { empValue, task } : undefined,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = Object.values(pendingAssignments).filter(Boolean);
    await Promise.all(
      toSave.map(({ empValue, task }) => {
        const emp = EMPLOYEES.find(e => String(e.value) === empValue);
        return base44.entities.RosterDatabase.create({
          date: selectedDate, shift_type: shiftType,
          employee_number: emp.value, employee_name: emp.label, daily_task: task,
        });
      })
    );
    setPendingAssignments({});
    setSaving(false);
    onUpdate();
    toast.success("Shift schedule updated!");
  };

  return (
    <div className={`rounded-xl border px-3 pt-2 pb-2.5 ${color.bg} ${color.border}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{emoji}</span>
        <span className={`text-xs font-bold ${color.title}`}>{title}</span>
        <span className={`text-[10px] ${color.sub}`}>· {subtitle}</span>
      </div>
      <div className="space-y-1">
        <DraggableShiftList entries={stableEntries} shiftKey={shiftType} isAdmin={isAdmin} onDelete={onDelete} onUpdate={onUpdate} userRotationMap={userRotationMap} />
        {Array.from({ length: emptyCount }, (_, i) => (
          <TemplateRow
            key={`tmpl-${shiftType}-${i}`}
            slotIndex={i}
            defaultTask={defaultTasks[stableEntries.length + i] || ""}
            isAdmin={isAdmin}
            pendingEmp={pendingAssignments[i]?.empValue || ""}
            onPendingChange={handlePendingChange}
            userRotationMap={userRotationMap}
          />
        ))}
      </div>
      {isAdmin && hasPending && (
        <div className="mt-2">
          <Button
            size="sm"
            className="w-full h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

function OffDayCard({ entries, isAdmin, onDelete, onUpdate, selectedDate, userRotationMap }) {
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  const stableEntries = [...entries].sort((a, b) => {
    const aO = a.sort_order ?? 9999;
    const bO = b.sort_order ?? 9999;
    if (aO !== bO) return aO - bO;
    return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
  });

  const emptyCount = Math.max(0, OFF_SLOTS - stableEntries.length);
  const hasPending = Object.keys(pendingAssignments).some(k => pendingAssignments[k]?.empValue);

  const handlePendingChange = (slotIndex, empValue, task) => {
    setPendingAssignments(prev => ({
      ...prev,
      [slotIndex]: empValue ? { empValue, task } : undefined,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = Object.values(pendingAssignments).filter(Boolean);
    await Promise.all(
      toSave.map(({ empValue, task }) => {
        const emp = EMPLOYEES.find(e => String(e.value) === empValue);
        return base44.entities.RosterDatabase.create({
          date: selectedDate, shift_type: "Off",
          employee_number: emp.value, employee_name: emp.label, daily_task: task,
        });
      })
    );
    setPendingAssignments({});
    setSaving(false);
    onUpdate();
    toast.success("Shift schedule updated!");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3 pt-2 pb-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">🌴</span>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Off Day</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">· Resting today</span>
      </div>
      <div className="space-y-1">
        <DraggableShiftList entries={stableEntries} shiftKey="Off" isAdmin={isAdmin} onDelete={onDelete} onUpdate={onUpdate} userRotationMap={userRotationMap} />
        {Array.from({ length: emptyCount }, (_, i) => (
          <TemplateRow
            key={`off-tmpl-${i}`}
            slotIndex={i}
            defaultTask={OFF_DEFAULTS[stableEntries.length + i] || ""}
            isAdmin={isAdmin}
            pendingEmp={pendingAssignments[i]?.empValue || ""}
            onPendingChange={handlePendingChange}
            userRotationMap={userRotationMap}
          />
        ))}
      </div>
      {isAdmin && hasPending && (
        <div className="mt-2">
          <Button
            size="sm"
            className="w-full h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

function offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export default function RosterView({ isAdmin = false }) {
  const today = todayInBrunei();
  const queryClient = useQueryClient();
  const [dayOffset, setDayOffset] = useState(0);
  const selectedDate = offsetDate(today, dayOffset);
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [qaForm, setQaForm] = useState({ date: today, employee: "", shift: "", task: "", caption: "" });
  const [qaSaving, setQaSaving] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["roster", selectedDate],
    queryFn: () => base44.entities.RosterDatabase.filter({ date: selectedDate }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-roster"],
    queryFn: () => base44.entities.User.list(),
  });

  // Map employee_name → rotationNumber for avatar display
  const userRotationMap = allUsers.reduce((acc, u) => {
    if (u.full_name && u.rotationNumber != null) acc[u.full_name] = u.rotationNumber;
    return acc;
  }, {});

  const amEntries  = entries.filter(e => e.shift_type === "AM");
  const pmEntries  = entries.filter(e => e.shift_type === "PM");
  const offEntries = entries.filter(e => e.shift_type === "Off");

  const getSortedShiftEntries = (shiftKey) => {
    const list = shiftKey === "AM" ? amEntries : shiftKey === "PM" ? pmEntries : offEntries;
    return [...list].sort((a, b) => {
      const aO = a.sort_order ?? 9999;
      const bO = b.sort_order ?? 9999;
      if (aO !== bO) return aO - bO;
      return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
    });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const shiftEntries = getSortedShiftEntries(source.droppableId);
    const reordered = Array.from(shiftEntries);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    await Promise.all(
      reordered.map((entry, i) =>
        base44.entities.RosterDatabase.update(entry.id, { sort_order: i * 10 })
      )
    );
    queryClient.invalidateQueries({ queryKey: ["roster"] });
  };

  const handleDelete = async (id) => {
    await base44.entities.RosterDatabase.delete(id);
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Entry removed.");
  };

  const handleUpdate = () => queryClient.invalidateQueries({ queryKey: ["roster"] });

  const handleQuickAssign = async () => {
    if (!qaForm.date || !qaForm.employee || !qaForm.shift) {
      toast.error("Please fill in date, employee and shift.");
      return;
    }
    setQaSaving(true);
    const emp = EMPLOYEES.find(e => String(e.value) === qaForm.employee);
    await base44.entities.RosterDatabase.create({
      date: qaForm.date, shift_type: qaForm.shift,
      employee_number: emp.value, employee_name: emp.label,
      daily_task: qaForm.task, caption: qaForm.caption,
    });
    queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Assignment saved!");
    setQaForm({ date: today, employee: "", shift: "", task: "", caption: "" });
    setShowQuickAssign(false);
    setQaSaving(false);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-2 pb-20">
        <div className="flex items-center justify-between py-0.5">
          {dayOffset > -1 ? (
            <button onClick={() => setDayOffset(d => d - 1)} className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : <div className="w-6" />}
          <div className="text-center">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMediumDate(selectedDate)}</span>
            {dayOffset === 0 && <span className="ml-1.5 text-[10px] text-blue-500 font-semibold">Today</span>}
          </div>
          {(isAdmin || dayOffset < 1) ? (
            <button onClick={() => setDayOffset(d => d + 1)} className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : <div className="w-6" />}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            <ShiftCard
              emoji="🌅" title="AM Shift" subtitle="9:00 AM – 6:00 PM"
              entries={amEntries} slotCount={AM_SLOTS} defaultTasks={AM_DEFAULTS} shiftType="AM"
              isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate} selectedDate={selectedDate}
              userRotationMap={userRotationMap}
              color={{ bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", title: "text-amber-800 dark:text-amber-300", sub: "text-amber-500 dark:text-amber-600" }}
            />
            <ShiftCard
              emoji="🌆" title="PM Shift" subtitle="1:00 PM – 9:00 PM"
              entries={pmEntries} slotCount={PM_SLOTS} defaultTasks={PM_DEFAULTS} shiftType="PM"
              isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate} selectedDate={selectedDate}
              userRotationMap={userRotationMap}
              color={{ bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", title: "text-violet-800 dark:text-violet-300", sub: "text-violet-500 dark:text-violet-600" }}
            />
            <OffDayCard entries={offEntries} isAdmin={isAdmin} onDelete={handleDelete} onUpdate={handleUpdate} selectedDate={selectedDate} userRotationMap={userRotationMap} />
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
    </DragDropContext>
  );
}