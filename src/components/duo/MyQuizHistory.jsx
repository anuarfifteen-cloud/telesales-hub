import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";

// ── Isolated Card Component with Internal Scroll ─────────────────────────────
function QuizHistoryCard({ entry }) {
  // Safe string data extraction fallback to protect against empty payloads
  const answerText = entry.answer || entry.user_answer || entry.selected_option || "No answer recorded";
  const correctText = entry.correct_option || entry.right_answer || "N/A";

  return (
    <div
      className={`rounded-xl border overflow-hidden h-auto flex flex-col ${
        entry.correct ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"
      }`}
    >
      {/* Header row */}
      <div className={`px-3 py-1.5 flex items-center justify-between flex-shrink-0 ${entry.correct ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
        <span className="text-[10px] font-bold text-muted-foreground">
          {entry.date ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Date Unknown"}
        </span>
        {entry.correct
          ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Correct</span>
          : <span className="flex items-center gap-1 text-[10px] font-black text-red-500"><XCircle className="w-3 h-3" /> Incorrect</span>
        }
      </div>

      {/* Body */}
      <div className="px-3 py-3 bg-card flex flex-col gap-2.5 h-auto text-xs">
        <p className="font-bold text-foreground leading-normal whitespace-normal break-words">
          {entry.question_text || "Missing Question Text"}
        </p>
        
        {/* User Answer Container */}
        <div className={`flex flex-col gap-1 w-full px-2.5 py-2 rounded-lg leading-normal ${
          entry.correct ? "bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50/60 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30"
        }`}>
          <span className="text-[10px] uppercase tracking-wider opacity-60 font-black shrink-0">
            You answered:
          </span>
          
          {/* 🔥 RIGHT-SIDE SCROLLBAR ENFORCEMENT */}
          <div 
            className={`max-h-20 overflow-y-scroll pr-1.5 whitespace-normal break-words font-semibold leading-relaxed text-left scrollbar-thin ${
              entry.correct ? "text-emerald-800 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
            }`}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {answerText}
          </div>
        </div>
        
        {/* Correct Option Resolution (Visible only on wrong attempts) */}
        {!entry.correct && (
          <div className="flex flex-col gap-1 w-full px-2.5 py-2 rounded-lg leading-normal border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20">
            <span className="text-[10px] uppercase tracking-wider opacity-60 font-black shrink-0">
              Correct Answer:
            </span>
            
            {/* 🔥 RIGHT-SIDE SCROLLBAR ENFORCEMENT */}
            <div 
              className="max-h-20 overflow-y-scroll pr-1.5 text-emerald-600 dark:text-emerald-400 font-bold whitespace-normal break-words leading-relaxed text-left scrollbar-thin"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {correctText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Layout Export ───────────────────────────────────────────────────────
export default function MyQuizHistory({ user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [fetched, setFetched] = useState(false);

  const fetchHistory = async () => {
    if (fetched) return;
    setLoading(true);
    const [asP1, asP2] = await Promise.all([
      base44.entities.DuoTeam.filter({ player1_id: user.id }),
      base44.entities.DuoTeam.filter({ player2_id: user.id }),
    ]);
    const teamIds = [...asP1, ...asP2].map(t => t.id);

    const allEntries = [];
    for (const teamId of teamIds) {
      const isP1 = asP1.some(t => t.id === teamId);
      const scores = await base44.entities.FiveDayScore.filter({ team_id: teamId });
      for (const s of scores) {
        const log = JSON.parse(s[isP1 ? "p1_question_log" : "p2_question_log"] || "[]");
        allEntries.push(...log);
      }
    }

    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistory(allEntries);
    setFetched(true);
    setLoading(false);
  };

  const handleToggle = () => {
    if (!open && !fetched) fetchHistory();
    setOpen(o => !o);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/40 transition-colors"
      >
        <span>📖 My Answer History</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && history.length === 0 && (
            <p className="text-muted-foreground italic text-center p-4 text-sm">No quiz history yet. Start answering daily questions!</p>
          )}

          {!loading && history.length > 0 && (
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 pb-24 relative isolation-auto">
              {history.map((entry, i) => (
                <QuizHistoryCard key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}