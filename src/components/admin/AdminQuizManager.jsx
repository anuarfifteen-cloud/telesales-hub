import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, BookOpen, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EMPTY_FORM = { question_text: "", option_a: "", option_b: "", option_c: "", correct_option: "", justification: "", is_active: true };

function QuizForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const options = [form.option_a, form.option_b, form.option_c].filter(Boolean);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.question_text || !form.option_a || !form.option_b || !form.option_c || !form.correct_option) {
      toast.error("Please fill in all fields.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border p-3 flex flex-col gap-2">
      <textarea
        value={form.question_text}
        onChange={e => set("question_text", e.target.value)}
        placeholder="Question text…"
        rows={2}
        className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
      />
      {["option_a", "option_b", "option_c"].map((field, i) => (
        <input
          key={field}
          value={form[field]}
          onChange={e => {
            set(field, e.target.value);
            // If correct_option matched old value, clear it
            if (form.correct_option === form[field]) set("correct_option", "");
          }}
          placeholder={`Option ${["A", "B", "C"][i]}…`}
          className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
      ))}
      <select
        value={form.correct_option}
        onChange={e => set("correct_option", e.target.value)}
        className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-pink-300"
      >
        <option value="">— Select Correct Answer —</option>
        {options.map((opt, i) => (
          <option key={i} value={opt}>{["A", "B", "C"][i]}. {opt}</option>
        ))}
      </select>
      <textarea
        value={form.justification}
        onChange={e => set("justification", e.target.value)}
        placeholder="Justification (why is this the correct answer?)…"
        rows={2}
        className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
      />
      <div className="flex gap-2 mt-1">
        <Button size="sm" onClick={handleSave} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs h-8">
          <Check className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 text-xs h-8">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function QuestionRow({ q, onEdit, onDelete, onToggle }) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1.5 ${q.is_active ? "bg-card border-border" : "bg-muted border-border opacity-60"}`}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs font-semibold text-foreground leading-snug">{q.question_text}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onToggle(q)} title={q.is_active ? "Deactivate" : "Activate"} className="text-muted-foreground hover:text-pink-500 transition-colors">
            {q.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(q)} className="text-muted-foreground hover:text-blue-500 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button onClick={() => { onDelete(q.id); setConfirmDel(false); }} className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded">Del</button>
              <button onClick={() => setConfirmDel(false)} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[["A", q.option_a], ["B", q.option_b], ["C", q.option_c]].map(([label, text]) => (
          <div
            key={label}
            className={`text-[10px] px-2 py-1 rounded-lg border ${text === q.correct_option ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold" : "bg-muted border-border text-muted-foreground"}`}
          >
            <span className="font-black">{label}.</span> {text}
          </div>
        ))}
      </div>
      {q.justification && (
        <p className="text-[10px] text-muted-foreground bg-muted rounded-lg px-2 py-1.5 border border-border italic">
          💡 {q.justification}
        </p>
      )}
    </div>
  );
}

export default function AdminQuizManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const qc = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["quiz-questions"],
    queryFn: () => base44.entities.QuizQuestion.list("-created_date", 200),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["quiz-questions"] });

  const handleCreate = async (form) => {
    await base44.entities.QuizQuestion.create(form);
    refresh();
    setShowForm(false);
    toast.success("Question added!");
  };

  const handleUpdate = async (form) => {
    await base44.entities.QuizQuestion.update(editingQ.id, form);
    refresh();
    setEditingQ(null);
    toast.success("Question updated!");
  };

  const handleDelete = async (id) => {
    await base44.entities.QuizQuestion.delete(id);
    refresh();
    toast.success("Question deleted.");
  };

  const handleToggle = async (q) => {
    await base44.entities.QuizQuestion.update(q.id, { is_active: !q.is_active });
    refresh();
  };

  const activeCount = questions.filter(q => q.is_active).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-bold text-foreground">Quiz Questions</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeCount >= 10 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
            {activeCount} active {activeCount < 10 && "⚠️ need 10+"}
          </span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingQ(null); }}
          className="flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-800 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
      </div>

      {showForm && !editingQ && (
        <QuizForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No questions yet. Add some to get started!</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {questions.map(q => (
            editingQ?.id === q.id ? (
              <QuizForm key={q.id} initial={editingQ} onSave={handleUpdate} onCancel={() => setEditingQ(null)} />
            ) : (
              <QuestionRow key={q.id} q={q} onEdit={setEditingQ} onDelete={handleDelete} onToggle={handleToggle} />
            )
          ))}
        </div>
      )}
    </div>
  );
}