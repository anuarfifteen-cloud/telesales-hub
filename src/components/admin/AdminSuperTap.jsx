import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
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

function getRankEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function AdminSuperTap() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["tapScoresAdmin"],
    queryFn: () => base44.entities.TapScore.list("-high_score", 50),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsersAdmin"],
    queryFn: () => base44.entities.User.list(),
  });

  const champUserIds = new Set(allUsers.filter(u => u.is_defending_champ).map(u => u.id));
  const eligibleScores = scores.filter(s => !champUserIds.has(s.user_id));

  const handleEndSeason = async () => {
    setProcessing(true);
    try {
      // Fetch all users to check defending champ status
      const allUsers = await base44.entities.User.list();
      const userMap = {};
      allUsers.forEach(u => { userMap[u.id] = u; });

      // Filter out defending champ from prize eligibility
      const eligibleScores = scores.filter(s => !userMap[s.user_id]?.is_defending_champ);
      const top3 = eligibleScores.slice(0, 3);
      const payouts = [5, 2, 1];

      let newChampUserId = null;

      // Pay out tokens to top 3 eligible players
      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];
        const tokenReward = payouts[i];
        if (!entry.user_id) continue;
        const u = userMap[entry.user_id];
        if (!u) continue;
        await base44.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens ?? 0) + tokenReward,
        });
        if (i === 0) newChampUserId = u.id;
      }

      // Reset is_defending_champ for ALL users
      for (const u of allUsers) {
        if (u.is_defending_champ) {
          await base44.entities.User.update(u.id, { is_defending_champ: false });
        }
      }

      // Set new defending champ
      if (newChampUserId) {
        await base44.entities.User.update(newChampUserId, { is_defending_champ: true });
      }

      // Delete ALL TapScore records
      const allScores = await base44.entities.TapScore.list();
      for (const s of allScores) {
        await base44.entities.TapScore.delete(s.id);
      }

      queryClient.invalidateQueries({ queryKey: ["tapScoresAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["tapScores"] });
      toast.success("✅ Season ended! Top 3 eligible players paid out & leaderboard wiped.");
    } catch (err) {
      toast.error("Error during payout: " + err.message);
    } finally {
      setProcessing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Season End Button */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">🚨 End Season (Auto-Payout & Wipe)</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            Awards tokens to Top 3, then deletes all scores to start a fresh season.
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

      {/* Leaderboard */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Leaderboard ({scores.length} players)</p>
        </div>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : scores.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No scores recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {scores.map((s, i) => {
              const isChamp = champUserIds.has(s.user_id);
              const eligibleRank = eligibleScores.findIndex(e => e.id === s.id);
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${isChamp ? "opacity-60 bg-muted/30" : i < 3 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                  <span className="text-base w-8 text-center font-bold flex-shrink-0">{getRankEmoji(i + 1)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {s.user_name}
                      {isChamp && <span className="ml-1.5 text-amber-500">👑</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {isChamp ? "Defending Champ — Prize Cooldown" : s.user_email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-primary tabular-nums">{s.high_score} taps</p>
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
            <AlertDialogTitle>🚨 End Season & Payout?</AlertDialogTitle>
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