import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";

export default function TokensTab({ user, onUserUpdate, totalBookingCount }) {
  const tokens = user?.earlyAccessTokens ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex flex-col items-center pt-4 gap-1">
        <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="Token" className="w-16 h-16" />
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
        <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="Token" className="w-16 h-16" />
      </div>

      {/* Early Access Toggle */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
        <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide"> 👑 VIP BOOKING PASS 👑</p>
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