import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, RotateCcw } from "lucide-react";
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
  const [awarding, setAwarding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["diamondSmashScoresAdmin"],
    queryFn: () => base44.entities.DiamondSmashScores.list("-score", 50),
  });

  const top3 = scores.slice(0, 3);

  const handleAward = async () => {
    setAwarding(true);
    try {
      const freshUsers = await base44.entities.User.list();
      const userMap = {};
      freshUsers.forEach((u) => { userMap[u.id] = u; });

      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];
        if (!entry.user_id) continue;
        const u = userMap[entry.user_id];
        if (!u) continue;
        const reward = PAYOUTS[i];
        await base44.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens ?? 0) + reward,
        });
        await base44.entities.TokenTransaction.create({
          user_id: u.id,
          user_name: u.full_name || u.email,
          amount: reward,
          source: `Diamond Smash Season Award — #${i + 1} Place (${entry.score} pts)`,
          timestamp: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["diamondSmashScoresAdmin"] });
      toast.success("✅ Season rewards awarded to top 3 winners!");
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setAwarding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      // Save the #1 winner to the Hall of Fame before wiping the season
      const top1 = scores[0];
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

      await base44.entities.DiamondSmashScores.deleteMany({});
      queryClient.invalidateQueries({ queryKey: ["diamondSmashScoresAdmin"] });
      toast.success("🔄 Diamond Smash season reset! All scores cleared.");
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setResetting(false);
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

      {/* Award Tokens */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">🏆 Award Tokens to Top 3 Winners</h3>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            🥇 +5 · 🥈 +2 · 🥉 +1 — added to each winner's token balance.
          </p>
        </div>
        <button
          onClick={handleAward}
          disabled={awarding || scores.length === 0}
          className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
          Award
        </button>
      </div>

      {/* Reset Season */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">🔄 Reset Diamond Smash Season</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            Permanently deletes ALL Diamond Smash scores. Award tokens first!
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={resetting || scores.length === 0}
          className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Reset
        </button>
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
            {scores.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 ? "bg-fuchsia-50/50 dark:bg-fuchsia-950/10" : ""}`}
              >
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={i + 1} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground" style={{ wordBreak: "break-word" }}>
                    {s.user_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-fuchsia-600 dark:text-fuchsia-400 tabular-nums">{s.score} pts</p>
                  {i === 0 && <span className="text-[10px] text-amber-600 font-semibold">+5 tokens</span>}
                  {i === 1 && <span className="text-[10px] text-amber-600 font-semibold">+2 tokens</span>}
                  {i === 2 && <span className="text-[10px] text-amber-600 font-semibold">+1 token</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Reset Diamond Smash Season?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete ALL Diamond Smash scores</strong>.
              <br /><br />
              Make sure you have <strong>awarded tokens to the top 3 winners first</strong> — this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReset}
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}