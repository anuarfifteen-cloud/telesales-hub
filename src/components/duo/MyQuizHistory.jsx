import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ── Isolated Card Component (Native HTML Expandable Accordion) ────────────────
function QuizHistoryCard({ entry }) {
  // Safe string data extraction fallbacks to protect against empty payloads
  const answerText = entry.answer || entry.user_answer || entry.selected_option || "No answer recorded";
  const correctText = entry.correct_option || entry.right_answer || "N/A";

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col mb-1"
      style={{ 
        height: "auto", 
        minHeight: "0px", 
        display: "flex", 
        borderColor: entry.correct ? "#a7f3d0" : "#fca5a5" 
      }}
    >
      {/* Header Banner */}
      <div 
        className="px-3 py-1.5 flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: entry.correct ? "rgba(209, 250, 229, 0.4)" : "rgba(254, 226, 226, 0.4)" }}
      >
        <span className="text-[10px] font-bold text-muted-foreground">
          {entry.date ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Daily Quiz"}
        </span>
        {entry.correct
          ? <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">✓ Correct</span>
          : <span className="text-[10px] font-black text-red-500 flex items-center gap-1">× Incorrect</span>
        }
      </div>

      {/* Main Body */}
      <div className="p-3 bg-card flex flex-col gap-2 text-xs" style={{ height: "auto", minHeight: "0px" }}>
        
        {/* Question Area */}
        <p className="font-bold text-foreground leading-normal" style={{ whiteSpace: "normal", wordBreak: "break-word", display: "block" }}>
          {entry.question_text || "Missing Question Text"}
        </p>
        
        {/* ── NATIVE BROWSER-ENGINE ACCORDION ── */}
        <details className="w-full group select-none cursor-pointer block">
          <summary className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1">
            <span>▶ Tap to view full answer details</span>
          </summary>
          
          <div className="mt-2 space-y-2" style={{ height: "auto", display: "block", minHeight: "0px" }}>
            {/* User Answer Container */}
            <div 
              className="p-2.5 rounded-lg border text-left" 
              style={{ 
                height: "auto",
                backgroundColor: entry.correct ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                borderColor: entry.correct ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"
              }}
            >
              <strong className="block text-[10px] uppercase opacity-60 mb-1 tracking-wider">Your Submitted Answer:</strong>
              <p className="text-foreground font-medium leading-relaxed" style={{ whiteSpace: "normal", wordBreak: "break-word", display: "block", height: "auto" }}>
                {answerText}
              </p>
            </div>

            {/* Error Correction Container (Only rendered on incorrect tries) */}
            {!entry.correct && (
              <div 
                className="p-2.5 rounded-lg border text-left bg-emerald-500/5 border-emerald-500/10" 
                style={{ height: "auto" }}
              >
                <strong className="block text-[10px] uppercase opacity-60 mb-1 tracking-wider text-emerald-700 dark:text-emerald-400">Correct Baseline Answer:</strong>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 leading-relaxed" style={{ whiteSpace: "normal", wordBreak: "break-word", display: "block", height: "auto" }}>
                  {correctText}
                </p>
              </div>
            )}
          </div>
        </details>

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
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 pb-32 relative isolation-auto">
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