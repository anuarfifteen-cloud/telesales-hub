import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";

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

    // Sort newest first
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
        <span>📖 My Past Answers</span>
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
            <p className="text-gray-500 italic text-center p-4 text-sm">No quiz answers recorded yet.</p>
          )}

          {!loading && history.length > 0 && (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-xl border overflow-hidden ${entry.correct ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}`}
                >
                  {/* Header row */}
                  <div className={`px-3 py-1.5 flex items-center justify-between ${entry.correct ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                    {entry.correct
                      ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Correct</span>
                      : <span className="flex items-center gap-1 text-[10px] font-black text-red-500"><XCircle className="w-3 h-3" /> Incorrect</span>
                    }
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2.5 bg-card flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-foreground leading-snug">{entry.question_text}</p>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${entry.correct ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"}`}>
                      <span className="opacity-60 shrink-0">You answered:</span>
                      <span className="font-bold">{entry.answer}</span>
                    </div>
                    {!entry.correct && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                        <span className="opacity-60 shrink-0">Correct:</span>
                        <span className="font-bold">{entry.correct_option}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}