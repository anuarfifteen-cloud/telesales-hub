import { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getVaultTier } from "@/lib/vaultTiers";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Metallic highlight styling for the top 3 ranks.
const RANK_STYLE = [
  { ring: "ring-amber-400", bg: "bg-gradient-to-r from-amber-100 to-yellow-200 dark:from-amber-900/40 dark:to-yellow-900/40", text: "text-amber-700 dark:text-amber-300", badge: "🥇" },
  { ring: "ring-slate-300", bg: "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700/40 dark:to-slate-600/40", text: "text-slate-700 dark:text-slate-200", badge: "🥈" },
  { ring: "ring-orange-300", bg: "bg-gradient-to-r from-orange-100 to-amber-200 dark:from-orange-900/40 dark:to-amber-900/40", text: "text-orange-700 dark:text-orange-300", badge: "🥉" },
];

export default function VaultTitansLeaderboard({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.AppSettings.list(),
        ]);
        setUsers(u);
        setSettings(s[0] || null);
      } catch {
        // ignore — leaderboard is non-critical
      } finally {
        setLoading(false);
      }
    };
    load();
    const unsub = base44.entities.User.subscribe(() => load());
    return () => { if (unsub) unsub(); };
  }, []);

  const filterInactive = settings?.filterInactiveFromLeaderboard === true;

  const ranked = users
    .map((u) => ({
      ...u,
      vault: Number(u.tapVaultBalance) || 0,
      hidden: u.hideFromLeaderboard === true,
      inactive:
        filterInactive &&
        (!u.lastActiveDate || Date.now() - new Date(u.lastActiveDate).getTime() > THIRTY_DAYS_MS),
    }))
    .filter((u) => !u.hidden && !u.inactive)
    .sort((a, b) => b.vault - a.vault);

  const top = ranked.slice(0, 10);
  const myRank = currentUser ? ranked.findIndex((u) => u.id === currentUser.id) : -1;

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-3 flex items-center gap-1.5">
        <Trophy className="w-4 h-4 text-amber-500" /> Vault Leaderboard
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : top.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          No visible vault holders yet. Deposit tokens to claim the throne!
        </p>
      ) : (
        <ol className="space-y-1.5">
          {top.map((u, i) => {
            const tier = getVaultTier(u.vault);
            const rs = RANK_STYLE[i] || null;
            const isMe = currentUser && u.id === currentUser.id;
            return (
              <li
                key={u.id}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${
                  isMe
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : rs
                    ? `${rs.ring} ring-1 ${rs.bg} border-transparent`
                    : "border-border bg-muted/30"
                }`}
              >
                <span className={`w-6 text-center text-sm font-black tabular-nums ${rs ? rs.text : "text-muted-foreground"}`}>
                  {rs ? rs.badge : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {u.full_name || u.email || "Anonymous"}
                    {isMe && <span className="ml-1.5 text-[10px] font-black text-primary">(YOU)</span>}
                  </p>
                  {tier && (
                    <span className={`text-[10px] font-bold ${tier.accent}`}>
                      {tier.icon} {tier.title}
                    </span>
                  )}
                </div>
                <span className="text-sm font-black tabular-nums text-primary">
                  {u.vault.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* My rank callout */}
      {currentUser && !loading && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          {myRank >= 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Your rank: <span className="font-black text-primary">#{myRank + 1}</span> of {ranked.length}{" "}
              {ranked.length === 1 ? "users" : "titans"}.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              You're not on the public leaderboard yet. Deposit tokens to your vault to appear!
            </p>
          )}
        </div>
      )}
    </div>
  );
}