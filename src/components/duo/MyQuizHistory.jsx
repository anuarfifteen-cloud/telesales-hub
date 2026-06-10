import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";

// ── Isolated Card Component with Inline Toggle ───────────────────────────────
function QuizHistoryCard({ entry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Consider an answer "long" if it crosses 80 characters
  const isLongAnswer = entry.answer && entry.answer.length > 80;
  
  // Truncate the text for the preview if not expanded
  const displayedAnswer = isExpanded || !isLongAnswer
    ? entry.answer
    : `${entry.answer.substring(0, 80)}...`;

  return (
    <div
      className={`rounded-xl border overflow-hidden h-auto flex flex-col ${
        entry.correct ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"
      }`}
    >
      {/* Header row */}
      <div className={`px-3 py-1.5 flex items-center justify-between flex-shrink-0 ${entry.correct ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
        <span className="text-[10px] font-bold text-muted-foreground">
          {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        {entry.correct
          ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Correct</span>
          : <span className="flex items-center gap-1 text-[10px] font-black text-red-500"><XCircle className="w-3 h-3" /> Incorrect</span>
        }
      </div>

      {/* Body */}
      <div className="px-3 py-3 bg-card flex flex-col gap-2.5 h-auto text-xs">
        <p className="font-bold text-foreground leading-normal whitespace-normal break-words">
          {entry.question_text}
        </p>
        
        {/* User Answer Container */}
        <div className={`block h-auto w-full px-2.5 py-2 rounded-lg leading-normal whitespace-normal break-words ${
          entry.correct ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30"
        }`}>
          <span className="block text-[10px] uppercase tracking-wider opacity-60 font-black mb-0.5">
            You answered:
          </span>
          <p className="text-foreground font-medium leading-relaxed whitespace-normal break-words">
            {displayedAnswer}
          </p>

          {/* View More / View Less Trigger */}
          {isLongAnswer && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1.5 text-[11px] font-bold underline flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              {isExpanded ? (
                <>View Less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>View Full Answer <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
        
        {/* Correct Option Resolution (Visible only on wrong attempts) */}
        {!entry.correct && (
          <div className="block h-auto w-full px-2.5 py-2 rounded-lg leading-normal whitespace-normal break-words border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
            <span className="block text-[10px] uppercase tracking-wider opacity-60 font-black mb-0.5">
              Correct Answer:
            </span>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-normal break-words leading-relaxed">
              {entry.correct_option}
            </p>
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
            /* 🔥 FIX SUMMARY:
              1. Changed max-h from a fixed size to a dynamic viewport boundary 'max-h-[60vh]' 
              2. Added 'pb-24' to force empty space at the bottom of the list 
              3. Added 'isolation' to prevent the floating navbar from eating clicks
            */
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