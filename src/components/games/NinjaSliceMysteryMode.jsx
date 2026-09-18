import { Loader2, Lock, Trophy } from "lucide-react";

/**
 * Mystery Mode card — shown in place of the live Ninja Slice leaderboard
 * when an admin has hidden it (hide_ninja_slice_leaderboard = true).
 * The game stays fully playable; players still see their own personal best,
 * but every other competitor's rank and score stays secret.
 */
export default function NinjaSliceMysteryMode({
  personalBest,
  loadingPB,
  currentUserId,
}) {
  return (
    <div className="w-full space-y-3">
      {/* Mystery banner — Golden Temple Dawn palette */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-[#B8860B] bg-gradient-to-b from-[#FDE093] to-[#D48E36] p-5 text-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FFF7E0] border-2 border-[#B8860B] flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#7a3b00]" />
          </div>
          <h3 className="font-black text-base uppercase tracking-widest text-[#3a2a1a]">
            🔒 Mystery Mode Active!
          </h3>
          <p className="text-[12px] text-[#5a3a1a] leading-relaxed max-w-[300px]">
            The leaderboard is hidden until the season deadline. Keep slicing to secure your spot — compete blind and bring your best!
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[#7a3b00] font-bold">
            Submit Unseen • Ranking Revealed at Season's End 🏆
          </p>
        </div>
      </div>

      {/* Personal best — always visible to the player */}
      <div className="w-full rounded-2xl border border-[#B8860B] bg-[#FFF7E0]/95 shadow-md overflow-hidden font-mono">
        <div className="px-4 py-3 border-b border-[#B8860B]/50 bg-[#FDE093]/60 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#B8860B]" />
            <p className="text-xs font-black uppercase tracking-widest text-[#7a3b00]">
              Your Personal Best
            </p>
          </div>
          <p className="text-[10px] text-[#7a3b00]/80">
            Only you can see this — everyone else is a mystery.
          </p>
        </div>
        <div className="px-5 py-6 flex flex-col items-center gap-1">
          {loadingPB ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#B8860B]" />
          ) : personalBest ? (
            <>
              <p className="font-black text-5xl tabular-nums text-[#3a2a1a]">
                {personalBest.score}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a3b00]">
                {currentUserId === personalBest.user_id ? "PTS — Your All-Time Best" : "PTS"}
              </p>
            </>
          ) : (
            <p className="text-sm text-center text-[#7a3b00]/70 font-bold uppercase tracking-widest">
              No score yet — play a round to set your best!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}