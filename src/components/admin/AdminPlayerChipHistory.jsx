import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ChipLedger, { ledgerQuery } from "@/components/casino21/ChipLedger";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";

// Admin player lookup — pick a player and read that player's own chip ledger
// (Casual hands, Ranked hands, wallet) with a win/loss summary for the ledger
// in view. Reads the same rows and the same query as the player's History view.
export default function AdminPlayerChipHistory() {
  const queryClient = useQueryClient();
  const [playerId, setPlayerId] = useState("");
  const [mode, setMode] = useState("casual");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-player-list"],
    queryFn: async () => {
      const rows = await base44.entities.User.list();
      return (rows || []).slice().sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "")
      );
    },
  });

  const player = users.find((u) => u.id === playerId);

  const { data: summaryRows = [], isFetching } = useQuery({
    queryKey: ["admin-player-summary", playerId, mode],
    enabled: !!playerId,
    queryFn: async () => {
      const res = await base44.entities.CasinoChipLog.aggregate({
        query: ledgerQuery(playerId, mode),
        groupBy: "action_type",
        sum: ["amount"],
      });
      return res?.rows || [];
    },
  });

  const stat = (type) => summaryRows.find((r) => r.action_type === type) || {};
  const wins = Number(stat("win").count) || 0;
  const losses = Number(stat("loss").count) || 0;
  const pushes = Number(stat("push").count) || 0;
  const events = summaryRows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const net = summaryRows.reduce((sum, r) => sum + (Number(r.sum_amount) || 0), 0);
  const playerHands = mode === "casual" || mode === "ranked";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-player-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-player-summary", playerId, mode] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
        <div>
          <h3 className="font-bold text-foreground text-base">🔎 Player Chip History</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick a player to see their Casual and Ranked hands plus every wallet chip movement, with the chips won or lost and the balance after each entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="flex-1 text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a player…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
          <button
            onClick={refresh}
            disabled={isFetching}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border border-border rounded-xl bg-card text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {player && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground">{player.full_name || player.email}</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-black tabular-nums text-amber-700 dark:text-amber-300">
              <MiniChipIcon size={12} />
              {Number(player.casinoChips) || 0} chips now
            </span>
          </div>
        )}
      </div>

      {!playerId ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Select a player to load their chip history.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {playerHands && (
              <>
                <StatTile label="Wins" value={wins} tone="emerald" />
                <StatTile label="Losses" value={losses} tone="rose" />
                <StatTile label="Pushes" value={pushes} tone="slate" />
              </>
            )}
            {!playerHands && <StatTile label="Entries" value={events} tone="slate" />}
            <StatTile
              label="Net chips"
              value={net > 0 ? `+${net}` : net}
              tone={net > 0 ? "emerald" : net < 0 ? "rose" : "slate"}
              className={playerHands ? "" : "col-span-1"}
            />
          </div>

          <ChipLedger userId={playerId} onTabChange={setMode} />
        </>
      )}
    </div>
  );
}

const TONES = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  slate: "text-foreground",
};

function StatTile({ label, value, tone = "slate" }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${TONES[tone]}`}>{value}</p>
    </div>
  );
}