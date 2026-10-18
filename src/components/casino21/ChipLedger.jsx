import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";
import useSeasonScore from "./useSeasonScore";
import { buildRankAfterMap } from "@/lib/ledgerRank";

// Full chip ledger — every chip balance change for a player, in one place.
// Three ledgers: the Casual table's hands, the Ranked table's hands, and the
// wallet (cashier buys/cash-outs, Mystery Card and mission chip rewards, daily
// gift, admin adjustments, multiplayer tables). Each entry shows the net chip
// change and the chip balance that resulted, so a win always reads as the chips
// actually paid, never a token amount.
const PAGE = 25;

const LEDGER_TABS = [
  { id: "casual", label: "CASUAL" },
  { id: "ranked", label: "RANKED" },
  { id: "wallet", label: "WALLET" },
];

const EMPTY_HINT = {
  casual: "No Casual table chips yet — deal a hand to see it here.",
  ranked: "No Ranked table chips yet — deal a hand to see it here.",
  wallet: "No wallet chip activity yet — Cashier buys, Mystery Card rewards and adjustments appear here.",
};

// The single source of truth for what each ledger holds, shared by the player's
// History view and the admin player lookup so both read exactly the same rows.
// Entries written before `mode` existed have no mode → they live in the wallet.
export function ledgerQuery(userId, tab) {
  if (tab === "wallet") {
    return { user_id: userId, $or: [{ mode: "wallet" }, { mode: { $exists: false } }] };
  }
  return { user_id: userId, mode: tab };
}

const ACTION_LABELS = {
  bet: "Chips bet",
  win: "Chips won",
  push: "Push refund",
  loss: "Chips lost",
  cashier_buy: "Buy chips",
  cashier_cashout: "Cash out",
  admin_add: "Chips added",
  admin_deduct: "Chips removed",
  admin_set: "Balance set",
};

function formatWhen(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      timeZone: "Asia/Brunei",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function LedgerRow({ entry, rank }) {
  const amount = Number(entry.amount) || 0;
  const tokensWon = Number(entry.tokens_won) || 0;
  const tokensSpent = Number(entry.tokens_spent) || 0;
  const balance = Number(entry.balance_after);
  const hasBalance = Number.isFinite(balance);

  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {ACTION_LABELS[entry.action_type] || entry.action_type}
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70">
          {formatWhen(entry.timestamp)}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span
          className={`flex items-center gap-1 text-sm font-black tabular-nums ${
            amount > 0 ? "text-emerald-600 dark:text-emerald-400" : amount < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
          }`}
        >
          {amount > 0 ? `+${amount}` : amount < 0 ? `−${Math.abs(amount)}` : "0"}
          <MiniChipIcon size={12} />
        </span>
        <span className="ml-auto flex flex-col items-end leading-tight text-[11px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground/70 font-semibold">Bal</span>
            {hasBalance ? balance : "—"}
          </span>
          {/* Ranked + Wallet ledgers: the season score as it stood right after
              this transaction, directly beneath the balance it left behind. */}
          {Number.isFinite(rank) && <span>Rank {rank}</span>}
        </span>
      </div>

      {entry.detail && (
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{entry.detail}</p>
      )}
      {/* A Casual win pays the wallet in tokens, so its chip line reads 0 — say
          so out loud instead of leaving a confusing zero. */}
      {tokensWon > 0 && (
        <p className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          Paid in tokens: +{tokensWon} (chips unchanged)
        </p>
      )}
      {tokensSpent > 0 && (
        <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
          Tokens spent: {tokensSpent}
        </p>
      )}
    </div>
  );
}

export default function ChipLedger({ userId, onTabChange }) {
  const [tab, setTab] = useState("casual");
  // Ranked + Wallet rows carry the season score as it stood after each entry.
  const rankShown = tab !== "casual";
  const seasonScore = useSeasonScore(userId, rankShown);
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const switchTab = (next) => {
    setTab(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setRows([]);
    setCursor(null);
    base44.entities.CasinoChipLog
      .filter(ledgerQuery(userId, tab), { sort: "-created_date", limit: PAGE })
      .then((page) => {
        if (!active) return;
        setRows(page.items || []);
        setCursor(page.next_cursor || null);
        setHasMore(!!page.has_more);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, tab, reloadKey]);

  // Each row's rank as it stood after that transaction.
  const rankAfter = useMemo(
    () => (rankShown ? buildRankAfterMap(rows, seasonScore) : null),
    [rows, seasonScore, rankShown]
  );

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await base44.entities.CasinoChipLog.filter(ledgerQuery(userId, tab), {
        sort: "-created_date",
        limit: PAGE,
        cursor,
      });
      setRows((prev) => [...prev, ...(page.items || [])]);
      setCursor(page.next_cursor || null);
      setHasMore(!!page.has_more);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 p-1 bg-muted/50 border border-border rounded-xl">
          {LEDGER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                tab === t.id
                  ? "bg-background text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          title="Refresh"
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">Nothing here yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">{EMPTY_HINT[tab]}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {rows.map((entry) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                rank={rankAfter ? rankAfter[entry.id] : null}
              />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-xl border border-border bg-card text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load older entries"}
            </button>
          )}
        </>
      )}
    </div>
  );
}