import { useEffect, useState } from "react";
import { Crown, Gem } from "lucide-react";
import {
  LIVE_WINS_LIMIT,
  LIVE_WINS_POLL_MS,
  formatBruneiWinStamp,
  loadRecentDealbreakerWins,
} from "@/lib/dealbreakerLiveFeed";

/**
 * Dealbreaker Live Activity — the five newest chip wins from every player.
 *
 * Reads the shared DealbreakerLiveWin rows on mount, then re-reads every 15
 * seconds while the Dealbreaker screen is open. `refreshKey` is bumped by the
 * game right after the current player's payout lands, so their own win shows
 * instantly instead of waiting for the next poll.
 */
export default function CloserLiveActivity({ refreshKey = 0 }) {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      loadRecentDealbreakerWins(LIVE_WINS_LIMIT)
        .then((rows) => {
          if (alive) setWins(rows);
        })
        .catch(() => {
          // A failed read keeps the previous rows on screen.
        })
        .finally(() => {
          if (alive) setLoading(false);
        });

    load();
    const timer = setInterval(load, LIVE_WINS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <section className="mt-2 rounded-2xl border border-border bg-card px-3 py-2.5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-foreground">
            Live Activity
          </h3>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Last 5 Wins • Brunei Time
        </span>
      </header>

      {wins.length > 0 ? (
        <ul className="mt-1.5 divide-y divide-border/60">
          {wins.map((win) => (
            <li key={win.id} className="flex items-center justify-between gap-2 py-[5px]">
              <div className="flex min-w-0 items-center gap-1">
                {win.is_vip && (
                  <Crown
                    className="h-3 w-3 shrink-0 text-amber-500"
                    aria-label="VIP agent"
                  />
                )}
                <span className="truncate text-[11px] font-semibold text-foreground">
                  {win.agent_name}
                </span>
                <span className="shrink-0 rounded-full border border-border px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                  {win.win_method}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {Number(win.payout_diamonds) > 0 ? (
                  <span className="flex items-center gap-1 text-[11px] font-black tabular-nums text-sky-600 dark:text-sky-400">
                    <Gem className="h-3 w-3 shrink-0" />
                    +{Number(win.payout_diamonds)} Diamond
                  </span>
                ) : (
                  <span className="text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{Number(win.payout_chips) || 0} Chips
                  </span>
                )}
                <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                  {formatBruneiWinStamp(win.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 py-1 text-[10px] leading-snug text-muted-foreground">
          {loading
            ? "Loading the latest wins…"
            : "No wins recorded yet — be the first to beat the VIP Client!"}
        </p>
      )}
    </section>
  );
}