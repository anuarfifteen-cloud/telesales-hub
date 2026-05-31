import { useState } from "react";
import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";
import CoinFlipArena from "@/components/coinflip/CoinFlipArena";

export default function TokensTab({ user, onUserUpdate, totalBookingCount }) {
  const [innerTab, setInnerTab] = useState("coinflip");
  const tokens = user?.earlyAccessTokens ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="Token" className="w-8 h-8" />
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-gray-100 leading-tight">Token Rewards</h2>
            <p className="text-[11px] text-muted-foreground">Earn &amp; spend your tokens</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full">
          <span className="text-lg font-black text-amber-500">{tokens}</span>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-1">🪙</span>
        </div>
      </div>

      {/* Inner tab switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setInnerTab("coinflip")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "coinflip"
              ? "bg-amber-500 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          🪙 Coin Flip
        </button>
        <button
          onClick={() => setInnerTab("milestones")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "milestones"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          🏆 Milestones
        </button>
        <button
          onClick={() => setInnerTab("vip")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "vip"
              ? "bg-purple-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          👑 VIP Pass
        </button>
      </div>

      {/* Coin Flip */}
      {innerTab === "coinflip" && (
        <CoinFlipArena user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Milestones */}
      {innerTab === "milestones" && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
          <EarlyAccessToggle user={user} onUserUpdate={onUserUpdate} totalBookingCount={totalBookingCount} showMilestones={true} />
        </div>
      )}

      {/* VIP Pass */}
      {innerTab === "vip" && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide">👑 VIP BOOKING PASS</p>
          <EarlyAccessToggle user={user} onUserUpdate={onUserUpdate} totalBookingCount={totalBookingCount} showMilestones={false} />
        </div>
      )}
    </div>
  );
}