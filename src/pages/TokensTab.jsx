import { Coins } from "lucide-react";
import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";

export default function TokensTab({ user, onUserUpdate, totalBookingCount }) {
  const tokens = user?.earlyAccessTokens ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex flex-col items-center pt-4 gap-1">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-amber-100 dark:ring-amber-900">
          <Coins className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100 mt-1">Token Rewards</h2>
        <p className="text-xs text-muted-foreground">Earn tokens by reaching booking milestones</p>
      </div>

      {/* Token Balance */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Your Balance</p>
          <p className="text-3xl font-bold text-amber-500">{tokens}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">token{tokens !== 1 ? "s" : ""} available</p>
        </div>
        <div className="text-5xl">🪙</div>
      </div>

      {/* Early Access Toggle */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
        <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide">⚡ Activate Early Access</p>
        <EarlyAccessToggle user={user} onUserUpdate={onUserUpdate} totalBookingCount={totalBookingCount} showMilestones={false} />
      </div>

      {/* Milestones */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
        <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide">🏆 Milestones</p>
        <EarlyAccessToggle user={user} onUserUpdate={onUserUpdate} totalBookingCount={totalBookingCount} showMilestones={true} />
      </div>
    </div>
  );
}