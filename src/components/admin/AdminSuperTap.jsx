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

  const handleEndSeason = async () => {
    setProcessing(true);
    try {
      const top3 = scores.slice(0, 3);
      const payouts = [5, 2, 1];

      // Pay out tokens to top 3
      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];
        const tokenReward = payouts[i];
        if (!entry.user_id) continue;

        // Find the user and update their token balance
        const users = await base44.entities.User.filter({ id: entry.user_id });
        if (users.length > 0) {
          const u = users[0];
          const current = u.earlyAccessTokens ?? 0;
          await base44.entities.User.update(u.id, {
            earlyAccessTokens: current + tokenReward,
          });
        }
      }

      // Delete ALL TapScore records
      const allScores = await base44.entities.TapScore.list();
      for (const s of allScores) {
        await base44.entities.TapScore.delete(s.id);
      }

      queryClient.invalidateQueries({ queryKey: ["tapScoresAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["tapScores"] });
      toast.success("✅ Season ended! Top 3 paid out & leaderboard wiped.");
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
            {scores.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                <span className="text-base w-8 text-center font-bold flex-shrink-0">{getRankEmoji(i + 1)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.user_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.user_email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-primary tabular-nums">{s.high_score} taps</p>
                  {i === 0 && <span className="text-[10px] text-amber-600 font-semibold">+5 tokens</span>}
                  {i === 1 && <span className="text-[10px] text-amber-600 font-semibold">+2 tokens</span>}
                  {i === 2 && <span className="text-[10px] text-amber-600 font-semibold">+1 token</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🚨 End Season & Payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will award tokens to the top 3 players:
              <br /><br />
              {scores[0] && <><strong>🥇 {scores[0].user_name}</strong> → +5 tokens<br /></>}
              {scores[1] && <><strong>🥈 {scores[1].user_name}</strong> → +2 tokens<br /></>}
              {scores[2] && <><strong>🥉 {scores[2].user_name}</strong> → +1 token<br /></>}
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