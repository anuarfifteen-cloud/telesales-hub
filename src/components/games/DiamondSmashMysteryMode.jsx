import { Loader2, Lock, Trophy } from "lucide-react";

/**
 * Mystery Mode card — shown in place of the live Diamond Smash leaderboard
 * when an admin has hidden it (hide_diamond_smash_leaderboard = true).
 * The game stays fully playable; players still see their own personal best,
 * but every other competitor's rank and score stays secret.
 */
export default function DiamondSmashMysteryMode({
  personalBest,
  loadingPB,
  currentUserId,
}) {
  return (
    <div className="w-full space-y-3" style={{ maxWidth: 364 }}>
      {/* Mystery banner */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.25)] bg-gradient-to-b from-[#2a1245] to-[#1a0b2e] p-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/50 flex items-center justify-center">
            <Lock className="w-6 h-6 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          </div>
          <h3 className="font-black text-base uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]">
            🔒 Mystery Mode Active!
          </h3>
          <p className="text-[12px] text-fuchsia-200/90 leading-relaxed max-w-[300px]">
            The leaderboard is hidden until the season deadline. Keep smashing to secure your spot — compete blind and bring your best!
          </p>
          <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold">
            Submit Unseen • Ranking Revealed at Season's End 🏆
          </p>
        </div>
      </div>

      {/* Personal best — always visible to the player */}
      <div className="w-full bg-card rounded-2xl border border-border shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-fuchsia-500/30 dark:shadow-[0_0_25px_rgba(217,70,239,0.15)] overflow-hidden">
        <div className="bg-muted border-b border-border dark:bg-gradient-to-b dark:from-slate-900 dark:to-transparent dark:border-fuchsia-500/20 px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <p className="text-xs font-black uppercase tracking-widest text-fuchsia-600 dark:bg-gradient-to-r dark:from-fuchsia-400 dark:to-amber-300 dark:bg-clip-text dark:text-transparent">
              Your Personal Best
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground dark:text-fuchsia-300/60">
            Only you can see this — everyone else is a mystery.
          </p>
        </div>
        <div className="px-5 py-6 flex flex-col items-center gap-1">
          {loadingPB ? (
            <Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 dark:text-fuchsia-400" />
          ) : personalBest ? (
            <>
              <p className="font-black text-5xl tabular-nums text-amber-600 dark:text-amber-400 drop-shadow-[0_0_18px_rgba(255,215,0,0.7)]">
                {personalBest.score}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-fuchsia-300/70">
                {currentUserId === personalBest.user_id ? "PTS — Your All-Time Best" : "PTS"}
              </p>
            </>
          ) : (
            <p className="text-sm text-center text-muted-foreground dark:text-fuchsia-300/60 font-bold uppercase tracking-widest">
              No score yet — play a round to set your best!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}