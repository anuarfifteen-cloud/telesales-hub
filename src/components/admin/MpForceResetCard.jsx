import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, RotateCcw, AlertTriangle, X, Users, Crown } from "lucide-react";
import { forceResetFields } from "@/components/casino21/mp/mpEngine";

const STATUS_LABEL = {
  waiting_for_bets: "Waiting for bets",
  player_turns: "Players playing",
  settling: "Scoring the pot",
  completed: "Round complete",
  resetting: "Resetting",
};

// Admin control for the shared Multiplayer Blackjack table. Lets an admin
// force-reset an abandoned/stuck table — clearing all seats, the round state,
// and the stale host assignment — so the next player who sits can run the
// engine again. Without this, a host who closes their tab mid-round can leave
// host_user_id pointing at a departed player, and queued JOIN actions from
// new players never get processed.
export default function MpForceResetCard() {
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    try {
      const page = await base44.entities.ActiveTable.filter(
        {},
        { sort: "created_date", limit: 1 }
      );
      setTable((page?.items || [])[0] || null);
    } catch (e) {
      setTable(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doReset = async () => {
    if (busy || !table) return;
    setBusy(true);
    try {
      await base44.entities.ActiveTable.update(table.id, forceResetFields());
      toast.success("Multiplayer table force-reset. Seats and host cleared.");
      setConfirming(false);
      await load();
    } catch (e) {
      toast.error("Reset failed: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🃏</span>
        <h3 className="font-bold text-foreground text-base">Multiplayer Blackjack · Force Reset</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Clears all seats, the round state and the stale host so new players can sit again. Use when a table is stuck after players closed their tabs.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !table ? (
        <p className="text-sm text-muted-foreground py-3">No shared table found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phase</p>
              <p className="text-xs font-bold text-foreground">{STATUS_LABEL[table.status] || table.status}</p>
            </div>
            <div className="rounded-xl bg-muted/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Seated</p>
              <p className="text-xs font-bold text-foreground tabular-nums">
                {(Array.isArray(table.seats) ? table.seats : []).filter((s) => s?.user_id).length}
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-center gap-1"><Crown className="w-3 h-3" /> Host</p>
              <p className="text-xs font-bold text-foreground truncate" title={table.host_user_id || "none"}>
                {table.host_user_id ? "Assigned" : "None"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-bold uppercase tracking-widest">Round</span>
            <span className="tabular-nums">{table.round_id || "—"}</span>
            <span className="ml-auto text-amber-600 dark:text-amber-400 font-semibold">
              Pot {Number(table.total_pot) || 0}
            </span>
          </div>

          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Force Reset Table
          </button>
        </div>
      )}

      {confirming && table && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !busy && setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Force Reset?
              </h3>
              <button onClick={() => setConfirming(false)} disabled={busy} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 pb-2">
              <p className="text-sm text-muted-foreground">
                This clears <span className="font-semibold text-foreground">all seats, the current round and the host assignment</span>. Any in-progress round is lost. New players can sit immediately after.
              </p>
            </div>
            <div className="px-5 pb-5 pt-1 flex flex-col gap-2">
              <button
                onClick={doReset}
                disabled={busy}
                className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Yes, Reset Now
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="w-full py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}