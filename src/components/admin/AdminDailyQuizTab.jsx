import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import AdminQuizManager from "./AdminQuizManager";

// ── Questions Overview ────────────────────────────────────────────────────────
function QuestionsOverview() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    base44.entities.QuizQuestion.list().then(q => {
      setQuestions(q);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!questions.length) return <div className="text-center py-8 text-muted-foreground text-sm">No questions found.</div>;

  const activeQuestions = questions.filter(q => q.is_active);
  const inactiveQuestions = questions.filter(q => !q.is_active);

  return (
    <div className="flex flex-col gap-4">
      {/* Active Questions */}
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
          Active Questions ({activeQuestions.length})
        </p>
        <div className="flex flex-col gap-2">
          {activeQuestions.map((q, i) => (
            <div key={q.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-3 py-3 flex items-start justify-between gap-2"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-black text-muted-foreground mt-0.5 shrink-0">Q{i + 1}</span>
                  <p className="text-xs font-semibold text-foreground leading-snug">{q.question_text}</p>
                </div>
                {expandedId === q.id
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                }
              </button>
              {expandedId === q.id && (
                <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/40 flex flex-col gap-2">
                  {[{ label: "A", val: q.option_a }, { label: "B", val: q.option_b }, { label: "C", val: q.option_c }].map(opt => (
                    <div key={opt.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${opt.val === q.correct_option ? "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold" : "bg-background border border-border text-foreground"}`}>
                      <span className="font-black opacity-60">{opt.label}.</span>
                      <span>{opt.val}</span>
                      {opt.val === q.correct_option && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                  {q.justification && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">💡 Justification</p>
                      <p className="text-xs text-foreground">{q.justification}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Questions */}
      {inactiveQuestions.length > 0 && (
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
            Inactive Questions ({inactiveQuestions.length})
          </p>
          <div className="flex flex-col gap-2">
            {inactiveQuestions.map((q) => (
              <div key={q.id} className="bg-muted border border-border rounded-xl px-3 py-2.5 opacity-60">
                <p className="text-xs font-semibold text-muted-foreground line-through">{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDailyQuizTab() {
  const [activeTab, setActiveTab] = useState("manage");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Panel</p>
        <p className="font-black text-lg">Daily Quiz</p>
        <p className="text-xs opacity-80">Manage questions for the solo daily quiz</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("manage")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "manage" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Manage Questions
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Overview
        </button>
      </div>

      {activeTab === "manage" && <AdminQuizManager />}
      {activeTab === "overview" && <QuestionsOverview />}
    </div>
  );
}