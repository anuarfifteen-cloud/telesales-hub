import { useCallback, useEffect, useState } from "react";
import { Gem, History } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { bruneiToday } from "@/lib/bruneiDay";
import { formatBruneiDate } from "@/lib/horseRacing";
import { ordinal } from "@/lib/derbyFinish";
import {
  MILESTONE_POINTS,
  POINTS_BY_PLACE,
  claimMilestoneDiamond,
  loadSeasonScores,
  rankScores,
  syncDerbySeason,
} from "@/lib/derbySeason";
import SeasonHistoryDrawer from "./SeasonHistoryDrawer";

function initialsOf(name) {
  const parts = (name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

/** Season standings, personal progress toward 100 points, and past season winners. */
export default function DerbyLeaderboard({ user, onUserUpdate }) {
  const [season, setSeason] = useState(null);
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const active = await syncDerbySeason(user);
      setSeason(active);
      setRows(rankScores(await loadSeasonScores(active?.season_number)));
      const past = await base44.entities.DerbySeasonHistory.list({ sort: "-season_number", limit: 12 });
      setHistory(past.items || []);
      setError("");
    } catch {
      setError("The leaderboard could not be loaded. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myRow = rows.find((row) => row.user_id === user?.id) || null;
  const points = Number(myRow?.points) || 0;
  const pct = Math.min(100, points);
  const qualified = points >= MILESTONE_POINTS && !myRow?.diamond_claimed;
  const finalToday = Boolean(season?.final_day) && season.final_day === bruneiToday();

  const handleClaim = async () => {
    if (!myRow || busy) return;
    setBusy(true);
    try {
      await claimMilestoneDiamond({ user, score: myRow });
      toast.success("1 Diamond added to your balance! 💎");
      await onUserUpdate?.();
      await refresh();
    } catch (e) {
      toast.error(e?.message || "The Diamond could not be claimed.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const statusText = myRow?.diamond_claimed
    ? "Diamond claimed this season"
    : qualified
      ? "Qualified — your 1 Diamond is ready"
      : `${Math.max(0, MILESTONE_POINTS - points)} points to reach the Diamond`;

  return (
    <div className="flex flex-col gap-3">
      {/* personal progress */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/40 p-3.5"
        style={{ background: "linear-gradient(150deg,#0f3b28 0%,#0a2a1d 60%,#072018 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.18)" }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
              Season {season?.season_number ?? 1} · Horse Betting
            </p>
            <h2 className="mt-0.5 text-2xl font-black leading-none text-amber-50">
              {points}
              <span className="ml-1 text-sm font-bold text-amber-200/60">/ {MILESTONE_POINTS} pts</span>
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-200">
            {myRow ? `Rank ${myRow.rank}` : "Unranked"}
          </span>
        </div>

        <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-emerald-950/70">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#f6c445,#fde68a)" }}
          />
        </div>

        <p className="relative mt-2 text-[11px] font-semibold text-amber-200/75">{statusText}</p>

        {qualified && (
          <button
            onClick={handleClaim}
            disabled={busy}
            className="relative mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-300 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-[0_3px_12px_rgba(212,175,55,0.45)] transition hover:brightness-105 disabled:opacity-60"
          >
            <Gem className="h-3.5 w-3.5" /> {busy ? "Claiming…" : "Claim 1 Diamond"}
          </button>
        )}

        {finalToday && (
          <p className="relative mt-2 rounded-lg bg-emerald-950/60 px-2 py-1.5 text-[10px] font-bold text-amber-200">
            Final day of the season — claims close at 23:59 tonight.
          </p>
        )}
      </div>

      {/* points guide — the same values the season credits per finishing place */}
      <div className="rounded-2xl border border-border bg-white/95 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Points guide
        </p>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {POINTS_BY_PLACE.map((pointsFor, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-1.5 py-1"
            >
              <span className="text-[10px] font-bold text-muted-foreground">{ordinal(i + 1)}</span>
              <span className="text-[10px] font-black tabular-nums text-foreground">+{pointsFor} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* standings */}
      <div className="rounded-2xl border border-border bg-white/95 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Season standings
          </p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
          >
            <History className="h-3 w-3" /> Past seasons
          </button>
        </div>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700">{error}</p>}

        {rows.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] font-semibold text-muted-foreground">
            No points yet this season. A bet scores 6 points for a winning horse, down to 1 point for
            fifth — once per race day.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            {rows.map((row) => {
              const mine = row.user_id === user?.id;
              return (
                <div
                  key={row.id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                    mine ? "bg-amber-50 ring-1 ring-amber-300" : "bg-muted/40"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                      row.rank === 1
                        ? "bg-amber-300 text-amber-950"
                        : row.rank === 2
                          ? "bg-slate-200 text-slate-700"
                          : row.rank === 3
                            ? "bg-orange-200 text-orange-900"
                            : "bg-white text-muted-foreground"
                    }`}
                  >
                    {row.rank}
                  </span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-900 text-[9px] font-black text-amber-200">
                    {initialsOf(row.user_name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-foreground">
                    {row.user_name || "Player"}
                    {mine && <span className="ml-1 text-[9px] font-black uppercase text-amber-600">You</span>}
                  </span>
                  {row.diamond_claimed && <Gem className="h-3 w-3 shrink-0 text-sky-500" />}
                  <span className="shrink-0 text-[11px] font-black tabular-nums text-foreground">{row.points}</span>
                  {mine && qualified && (
                    <button
                      onClick={handleClaim}
                      disabled={busy}
                      className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-950 disabled:opacity-60"
                    >
                      Claim 💎
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {season?.final_day && (
        <p className="rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
          Season {season.season_number} ends after {formatBruneiDate(season.final_day)} at 23:59 Brunei time. The
          next season starts automatically the first time someone opens Horse Betting after that.
        </p>
      )}

      <SeasonHistoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} history={history} />
    </div>
  );
}