import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { rebuildRankedBestStreaks } from "@/lib/rebuildStreaks";

// Admin-only rebuild of every player's Ranked best win streak, recalculated
// from the hands actually saved in Game History. Runs only when the admin
// confirms, and reports exactly what changed.
export default function AdminStreakRebuild() {
  const [confirm, setConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [report, setReport] = useState(null);

  const run = async () => {
    setConfirm(false);
    setRunning(true);
    setReport(null);
    setScanned(0);
    try {
      const result = await rebuildRankedBestStreaks({
        onProgress: (n) => setScanned(n),
      });
      setReport(result);
      toast.success(
        result.corrected.length
          ? `${result.corrected.length} player${result.corrected.length === 1 ? "" : "s"} corrected.`
          : "Every saved best streak already matches the hand history."
      );
    } catch {
      toast.error("The rebuild couldn't finish. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-slate-50 px-3 py-3 space-y-2.5">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          🔁 Rebuild Ranked Best Streaks
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Recalculates every player's longest Ranked winning run from their
          recorded hands and corrects the season record and leaderboard. Saved
          streaks are never lowered.
        </p>
      </div>

      <button
        onClick={() => setConfirm(true)}
        disabled={running}
        className="w-full py-2.5 rounded-xl border border-slate-900 bg-white text-slate-900 text-sm font-bold hover:bg-slate-900 hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
        {running ? `Reading hand history… ${scanned}` : "Rebuild from Hand History"}
      </button>

      {report && (
        <div className="space-y-2 text-[11px] leading-snug">
          <p className="text-slate-600">
            Scanned <span className="font-bold text-slate-900">{report.hands}</span>{" "}
            Ranked hands across{" "}
            <span className="font-bold text-slate-900">{report.players}</span> players
            · season {report.season}.
          </p>

          {report.corrected.length > 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 space-y-1">
              <p className="font-bold uppercase tracking-widest text-[9px] text-emerald-700">
                Corrected ({report.corrected.length})
              </p>
              {report.corrected.map((c) => (
                <p key={c.name} className="text-slate-800">
                  <span className="font-bold">{c.name}</span> — best{" "}
                  <span className="font-black text-emerald-700">{c.to} wins</span>
                  {c.from > 0 ? ` (was ${c.from})` : ""}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">
              No change needed — every saved best streak already matches the hand
              history ({report.unchanged} checked).
            </p>
          )}

          {report.flagged.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 space-y-1">
              <p className="flex items-center gap-1 font-bold uppercase tracking-widest text-[9px] text-amber-700">
                <AlertTriangle className="w-3 h-3" /> Needs a look
              </p>
              {report.flagged.map((f, i) => (
                <p key={`${f.name}-${i}`} className="text-slate-700">
                  <span className="font-bold">{f.name}</span> — {f.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          >
            <h3 className="font-bold text-slate-900 text-lg">
              Rebuild Best Streaks?
            </h3>
            <p className="text-sm text-slate-600">
              Every player's longest Ranked winning run is recalculated from their
              saved hands. Higher saved streaks stay as they are. This can take a
              moment on a large history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={run}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition"
              >
                Yes, Rebuild
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}