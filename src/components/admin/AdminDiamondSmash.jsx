import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Crown, UserX, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-black text-slate-600 dark:text-slate-300">
      {rank}
    </span>
  );
}

const PAYOUTS = [5, 2, 1];

export default function AdminDiamondSmash() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [champLoading, setChampLoading] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["diamondSmashScoresAdmin"],
    queryFn: () => base44.entities.DiamondSmashScores.list("-score", 50),
  });

  const { data: allUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["allUsersAdminDiamond"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: appSettingsRows = [] } = useQuery({
    queryKey: ["appSettingsAdminDiamond"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const appSettings = appSettingsRows[0] || {};
  const hideLeaderboard = !!appSettings.hide_diamond_smash_leaderboard;
  const [togglingLB, setTogglingLB] = useState(false);

  const toggleLeaderboardVisibility = async () => {
    setTogglingLB(true);
    try {
      const next = !hideLeaderboard;
      if (appSettingsRows[0]) {
        await base44.entities.AppSettings.update(appSettingsRows[0].id, {
          hide_diamond_smash_leaderboard: next,
        });
      } else {
        await base44.entities.AppSettings.create({
          hide_diamond_smash_leaderboard: next,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["appSettingsAdminDiamond"] });
      toast.success(
        next
          ? "🔒 Diamond Smash leaderboard hidden (Mystery Mode)"
          : "👁️ Diamond Smash leaderboard is now visible"
      );
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setTogglingLB(false);
    }
  };

  const champUserIds = new Set(allUsers.filter((u) => u.is_defending_champ_diamond).map((u) => u.id));
  const champs = allUsers.filter((u) => u.is_defending_champ_diamond);
  const nonChamps = allUsers.filter((u) => !u.is_defending_champ_diamond);
  const eligibleScores = scores.filter((s) => !champUserIds.has(s.user_id));

  // Syncs the publicly-readable champ ID list on AppSettings so regular users see the crown
  const syncChampSettings = async (championUserIds) => {
    const settings = appSettingsRows[0];
    if (settings) {
      await base44.entities.AppSettings.update(settings.id, { defending_champ_diamond_ids: championUserIds });
    } else {
      await base44.entities.AppSettings.create({ defending_champ_diamond_ids: championUserIds });
    }
    queryClient.invalidateQueries({ queryKey: ["appSettingsAdminDiamond"] });
  };

  const toggleChamp = async (u, makeChamp) => {
    setChampLoading(u.id);
    try {
      await base44.entities.User.update(u.id, { is_defending_champ_diamond: makeChamp });
      const updatedChampIds = makeChamp
        ? [...champUserIds, u.id]
        : [...champUserIds].filter((id) => id !== u.id);
      await syncChampSettings(updatedChampIds);
      await refetchUsers();
      toast.success(
        makeChamp
          ? `👑 ${u.full_name} set as Defending Champ`
          : `✅ ${u.full_name} removed from Defending Champ`
      );
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setChampLoading(null);
      setShowUserPicker(false);
      setPickerSearch("");
    }
  };

  const filteredNonChamps = nonChamps.filter((u) =>
    (u.full_name || u.email || "").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const handleEndSeason = async () => {
    setProcessing(true);
    try {
      const freshUsers = await base44.entities.User.list();
      const userMap = {};
      freshUsers.forEach((u) => { userMap[u.id] = u; });

      // Top 3 eligible players (defending champ is skipped)
      const eligible = scores.filter((s) => !userMap[s.user_id]?.is_defending_champ_diamond);
      const top3 = eligible.slice(0, 3);

      let newChampUserId = null;

      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];
        if (!entry.user_id) continue;
        const u = userMap[entry.user_id];
        if (!u) continue;
        const tokenReward = PAYOUTS[i];
        await base44.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens ?? 0) + tokenReward,
        });
        await base44.entities.TokenTransaction.create({
          user_id: u.id,
          user_name: u.full_name || u.email,
          amount: tokenReward,
          source: `Diamond Smash Season Reward — #${i + 1} Place (${entry.score} pts)`,
          timestamp: new Date().toISOString(),
        });
        if (i === 0) newChampUserId = u.id;
      }

      // Save #1 eligible winner to Hall of Fame
      const top1 = top3[0];
      if (top1 && top1.user_id) {
        await base44.entities.DiamondSmashHallOfFame.create({
          user_id: top1.user_id,
          user_name: top1.user_name,
          score: top1.score,
          rank: 1,
          season_label: `Season — ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`,
          awarded_at: new Date().toISOString(),
        });
      }

      // Clear all existing defending champ diamond flags
      for (const u of freshUsers) {
        if (u.is_defending_champ_diamond) {
          await base44.entities.User.update(u.id, { is_defending_champ_diamond: false });
        }
      }

      // Set new defending champ
      if (newChampUserId) {
        await base44.entities.User.update(newChampUserId, { is_defending_champ_diamond: true });
      }
      await syncChampSettings(newChampUserId ? [newChampUserId] : []);

      // Wipe the leaderboard
      await base44.entities.DiamondSmashScores.deleteMany({});

      queryClient.invalidateQueries({ queryKey: ["diamondSmashScoresAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdminDiamond"] });
      toast.success("✅ Diamond Smash season ended! Top 3 eligible players paid & leaderboard wiped.");
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 to-amber-500 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Panel</p>
        <p className="font-black text-lg">💎 Diamond Smash</p>
        <p className="text-xs opacity-80">Manage the seasonal Diamond Smash leaderboard</p>
      </div>

      {/* Leaderboard Visibility Toggle */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground">👁️ Show Diamond Smash Leaderboard to Players</h3>
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                  hideLeaderboard
                    ? "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {hideLeaderboard ? "🔴 Hidden (Mystery Mode)" : "🟢 Leaderboard Visible"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              When hidden, the game stays fully playable — players can keep smashing and still see their own personal best, but all other competitors' ranks and scores stay secret until the season deadline.
            </p>
          </div>
          <button
            onClick={toggleLeaderboardVisibility}
            disabled={togglingLB}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
              hideLeaderboard
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                : "bg-red-600 hover:bg-red-700 text-white border-red-700"
            } disabled:opacity-50`}
          >
            {togglingLB ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hideLeaderboard ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {hideLeaderboard ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {/* End Season Button */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">🚨 End Season (Auto-Payout & Wipe)</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            Awards tokens to Top 3 eligible players (defending champ skipped), records the champ to the Hall of Fame, then wipes the leaderboard.
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={processing || scores.length === 0}
          className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "End Season"}
        </button>
      </div>

      {/* Defending Champ */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">👑 Defending Champion (Cooldown)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">This user is ineligible for prizes next season.</p>
          </div>
          <button
            onClick={() => setShowUserPicker((v) => !v)}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Champ
          </button>
        </div>

        {showUserPicker && (
          <div className="border-b border-border px-4 py-3 bg-amber-50 dark:bg-amber-950/20 space-y-2">
            <input
              autoFocus
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-white dark:bg-card">
              {filteredNonChamps.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
              ) : (
                filteredNonChamps.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleChamp(u, true)}
                    disabled={champLoading === u.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left"
                  >
                    {champLoading === u.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {champs.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No defending champion set.</div>
        ) : (
          <div className="divide-y divide-border">
            {champs.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10">
                <span className="text-lg">👑</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Prize Cooldown Active</p>
                </div>
                <button
                  onClick={() => toggleChamp(u, false)}
                  disabled={champLoading === u.id}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors bg-white dark:bg-card"
                >
                  {champLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Top Scores ({scores.length} players)
          </p>
        </div>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : scores.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No scores recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {scores.map((s, i) => {
              const isChamp = champUserIds.has(s.user_id);
              const eligibleRank = eligibleScores.findIndex((e) => e.id === s.id);
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isChamp ? "opacity-60 bg-muted/30" : i < 3 ? "bg-fuchsia-50/50 dark:bg-fuchsia-950/10" : ""
                  }`}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankBadge rank={i + 1} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap" style={{ wordBreak: "break-word" }}>
                      <span>{s.user_name}</span>
                      {isChamp && <span className="text-base flex-shrink-0">👑</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isChamp
                        ? "Defending Champ — Prize Cooldown"
                        : s.updated_at
                          ? new Date(s.updated_at).toLocaleDateString()
                          : "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-fuchsia-600 dark:text-fuchsia-400 tabular-nums">{s.score} pts</p>
                    {!isChamp && eligibleRank === 0 && <span className="text-[10px] text-amber-600 font-semibold">+5 tokens</span>}
                    {!isChamp && eligibleRank === 1 && <span className="text-[10px] text-amber-600 font-semibold">+2 tokens</span>}
                    {!isChamp && eligibleRank === 2 && <span className="text-[10px] text-amber-600 font-semibold">+1 token</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🚨 End Diamond Smash Season & Payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will award tokens to the top 3 <strong>eligible</strong> players (defending champ is skipped):
              <br /><br />
              {eligibleScores[0] && (<><strong>🥇 {eligibleScores[0].user_name}</strong> → +5 tokens<br /></>)}
              {eligibleScores[1] && (<><strong>🥈 {eligibleScores[1].user_name}</strong> → +2 tokens<br /></>)}
              {eligibleScores[2] && (<><strong>🥉 {eligibleScores[2].user_name}</strong> → +1 token<br /></>)}
              <br />
              The #1 winner is recorded to the Hall of Fame, granted the defending champ flag, and <strong>ALL scores will be permanently deleted</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEndSeason}
            >
              Yes, End Season
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}