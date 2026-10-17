import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Sparkles, Gift } from "lucide-react";
import { REWARD_META, rewardLabel } from "@/components/casino21/milestone/mysteryCardKit";

const PAGE_SIZE = 50;

// Admin monitor for the Daily & Bonus Mystery Card: one row per player per
// Brunei day on which a card was revealed, newest day first, paged with the
// server cursor so the full history is browsable without loading everything.
export default function AdminMysteryCardHistory() {
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirstPage = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.DailyChallenge.filter(
        {
          $or: [
            { daily_mystery_card_status: "revealed" },
            { bonus_mystery_card_status: "revealed" },
          ],
        },
        { sort: "-day", limit: PAGE_SIZE }
      );
      setRows(page.items || []);
      setCursor(page.next_cursor || null);
      setHasMore(!!page.has_more);
    } catch {
      setRows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await base44.entities.DailyChallenge.filter(
        {
          $or: [
            { daily_mystery_card_status: "revealed" },
            { bonus_mystery_card_status: "revealed" },
          ],
        },
        { sort: "-day", limit: PAGE_SIZE, cursor }
      );
      setRows((prev) => [...prev, ...(page.items || [])]);
      setCursor(page.next_cursor || null);
      setHasMore(!!page.has_more);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFirstPage();
  }, []);

  const RewardPill = ({ type, icon: Icon, tint }) => {
    if (!type) return <span className="text-xs text-slate-400">—</span>;
    const meta = REWARD_META[type];
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
        style={{
          background: `${meta?.color || "#64748b"}1a`,
          border: `1px solid ${meta?.color || "#64748b"}66`,
          color: tint || meta?.color || "#475569",
        }}
      >
        <Icon className="w-3 h-3" />
        {rewardLabel(type)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div className="flex items-start gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base">🃏 Mystery Card History</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Every Daily and Bonus Mystery Card revealed by each player, newest day first.
          </p>
        </div>
        <button
          onClick={loadFirstPage}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">
          No Mystery Cards revealed yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1.2fr_1.2fr] gap-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Player</span>
            <span>Day</span>
            <span>Daily Card</span>
            <span>Bonus Card</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1.2fr_1.2fr] gap-1.5 sm:gap-2 py-3 sm:items-center"
            >
              <span className="text-sm font-semibold text-slate-800 truncate">
                {r.user_name || "—"}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">{r.day}</span>
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-slate-400 sm:hidden" />
                <RewardPill type={r.daily_mystery_card_reward} icon={Sparkles} />
              </span>
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-slate-400 sm:hidden" />
                <RewardPill type={r.bonus_mystery_card_reward} icon={Sparkles} tint="#0f766e" />
              </span>
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}