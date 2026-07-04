import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Crown, UserX, Plus } from "lucide-react";
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

export default function AdminFlappyToken() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [flappyEnabled, setFlappyEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState("medium");
  const [savingSettings, setSavingSettings] = useState(false);
  const [champLoading, setChampLoading] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.entities.AppSettings.list().then(rows => {
      const s = rows[0];
      if (s) {
        setSettingsId(s.id);
        setFlappyEnabled(s.flappy_enabled !== false);
        setDifficulty(s.flappy_difficulty || "medium");
      }
    });
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    const payload = { flappy_enabled: flappyEnabled, flappy_difficulty: difficulty };
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, payload);
    } else {
      const created = await base44.entities.AppSettings.create(payload);
      setSettingsId(created.id);
    }
    setSavingSettings(false);
    toast.success("Game settings saved!");
  };

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["flappyLeaderboardAdmin"],
    queryFn: () => base44.entities.FlappyLeaderboard.list("-score", 50),
  });

  const { data: allUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["allUsersAdminFlappy"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: appSettingsRows = [] } = useQuery({
    queryKey: ["appSettingsAdminFlappy"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const champUserIds = new Set(allUsers.filter(u => u.is_defending_champ_flappy).map(u => u.id));
  const champs = allUsers.filter(u => u.is_defending_champ_flappy);
  const nonChamps = allUsers.filter(u => !u.is_defending_champ_flappy);
  const eligibleScores = scores.filter(s => !champUserIds.has(s.user_id));

  // Syncs the publicly-readable champ ID list on AppSettings so regular users can see the crown
  const syncChampSettings = async (championUserIds) => {
    const settings = appSettingsRows[0];
    if (settings) {
      await base44.entities.AppSettings.update(settings.id, { defending_champ_flappy_ids: championUserIds });
    } else {
      await base44.entities.AppSettings.create({ defending_champ_flappy_ids: championUserIds });
    }
    queryClient.invalidateQueries({ queryKey: ["appSettingsAdminFlappy"] });
  };

  const toggleChamp = async (u, makeChamp) => {
    setChampLoading(u.id);
    try {
      await base44.entities.User.update(u.id, { is_defending_champ_flappy: makeChamp });
      const updatedChampIds = makeChamp
        ? [...champUserIds, u.id]
        : [...champUserIds].filter(id => id !== u.id);
      await syncChampSettings(updatedChampIds);
      await refetchUsers();
      toast.success(makeChamp ? `👑 ${u.full_name} set as Defending Champ` : `✅ ${u.full_name} removed from Defending Champ`);
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setChampLoading(null);
      setShowUserPicker(false);
      setPickerSearch("");
    }
  };

  const filteredNonChamps = nonChamps.filter(u =>
    (u.full_name || u.email || "").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const handleEndSeason = async () => {
    setProcessing(true);
    try {
      const freshUsers = await base44.entities.User.list();
      const userMap = {};
      freshUsers.forEach(u => { userMap[u.id] = u; });

      const eligible = scores.filter(s => !userMap[s.user_id]?.is_defending_champ_flappy);
      const top3 = eligible.slice(0, 3);
      const payouts = [5, 2, 1];

      let newChampUserId = null;

      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];
        if (!entry.user_id) continue;
        const u = userMap[entry.user_id];
        if (!u) continue;
        const tokenReward = payouts[i];
        await base44.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens ?? 0) + tokenReward,
        });
        await base44.entities.TokenTransaction.create({
          user_id: u.id,
          user_name: u.full_name || u.email,
          amount: tokenReward,
          source: `Flappy Token Season Reward — #${i + 1} Place (${entry.score} pts)`,
          timestamp: new Date().toISOString(),
        });
        if (i === 0) newChampUserId = u.id;
      }

      // Clear all defending champ flappy flags
      for (const u of freshUsers) {
        if (u.is_defending_champ_flappy) {
          await base44.entities.User.update(u.id, { is_defending_champ_flappy: false });
        }
      }

      // Set new champ
      if (newChampUserId) {
        await base44.entities.User.update(newChampUserId, { is_defending_champ_flappy: true });
      }
      await syncChampSettings(newChampUserId ? [newChampUserId] : []);

      // Delete all leaderboard entries
      const allScores = await base44.entities.FlappyLeaderboard.list();
      for (const s of allScores) {
        await base44.entities.FlappyLeaderboard.delete(s.id);
      }

      queryClient.invalidateQueries({ queryKey: ["flappyLeaderboardAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdminFlappy"] });
      toast.success("✅ Flappy season ended! Top 3 paid out & leaderboard wiped.");
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
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Admin Panel</p>
        <p className="font-black text-lg">🐦 Flappy Token</p>
        <p className="text-xs opacity-80">Manage the seasonal Flappy Token leaderboard</p>
      </div>

      {/* Game Settings */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">⚙️ Game Settings</p>

        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Game Enabled</p>
            <p className="text-xs text-muted-foreground">Off shows "Coming Soon 👀" to players</p>
          </div>
          <button
            onClick={() => setFlappyEnabled(v => !v)}
            className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${flappyEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
            style={{ width: "52px" }}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${flappyEnabled ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Difficulty selector */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">Difficulty</p>
          <div className="flex gap-2">
            {["easy", "medium", "hard"].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                  difficulty === d
                    ? d === "easy" ? "bg-emerald-500 text-white border-emerald-500"
                      : d === "hard" ? "bg-red-500 text-white border-red-500"
                      : "bg-yellow-500 text-white border-yellow-500"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Settings"}
        </button>
      </div>

      {/* End Season Button */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">🚨 End Season (Auto-Payout & Wipe)</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            Awards tokens to Top 3 eligible players, then wipes leaderboard.
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
            onClick={() => setShowUserPicker(v => !v)}
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
              onChange={e => setPickerSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-white dark:bg-card">
              {filteredNonChamps.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
              ) : filteredNonChamps.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleChamp(u, true)}
                  disabled={champLoading === u.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left"
                >
                  {champLoading === u.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    : <Crown className="w-4 h-4 text-amber-500" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {champs.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No defending champion set.</div>
        ) : (
          <div className="divide-y divide-border">
            {champs.map(u => (
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
        {scoresLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : scores.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No scores recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {scores.map((s, i) => {
              const isChamp = champUserIds.has(s.user_id);
              const eligibleRank = eligibleScores.findIndex(e => e.id === s.id);
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${isChamp ? "opacity-60 bg-muted/30" : i < 3 ? "bg-cyan-50/50 dark:bg-cyan-950/10" : ""}`}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankBadge rank={i + 1} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{s.user_name}</span>
                      {isChamp && <span className="text-base flex-shrink-0">👑</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isChamp ? "Defending Champ — Prize Cooldown" : `Last updated: ${s.updated_at ? new Date(s.updated_at).toLocaleDateString() : "—"}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-cyan-600 dark:text-cyan-400 tabular-nums">{s.score} pts</p>
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
            <AlertDialogTitle>🚨 End Flappy Season & Payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will award tokens to the top 3 <strong>eligible</strong> players (defending champ is skipped):
              <br /><br />
              {eligibleScores[0] && <><strong>🥇 {eligibleScores[0].user_name}</strong> → +5 tokens<br /></>}
              {eligibleScores[1] && <><strong>🥈 {eligibleScores[1].user_name}</strong> → +2 tokens<br /></>}
              {eligibleScores[2] && <><strong>🥉 {eligibleScores[2].user_name}</strong> → +1 token<br /></>}
              <br />
              Then <strong>ALL scores will be permanently deleted</strong>. This cannot be undone.
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