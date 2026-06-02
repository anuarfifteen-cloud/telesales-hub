import { useState } from "react";
import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";
import CoinFlipArena from "@/components/coinflip/CoinFlipArena";
import PerfectTen from "@/components/coinflip/PerfectTen";
import VipActivityFeed from "@/components/coinflip/VipActivityFeed";

export default function TokensTab({ user, onUserUpdate, totalBookingCount, isAdmin }) {
  const [innerTab, setInnerTab] = useState("milestones");
  // tabs: milestones | perfect10 | coinflip | vip
  const tokens = user?.earlyAccessTokens ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Token Balance Card */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Balance</span>
          <span className="text-3xl font-black text-foreground">{tokens}</span>
          <span className="text-xs text-muted-foreground">tokens available</span>
        </div>
        <img
          src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
          alt="token"
          className="w-14 h-14"
        />
      </div>

      {/* Inner tab switcher: Milestones | Perfect 10 | Coin Flip | VIP Pass */}
      {/* Row 1: Milestones | VIP Pass  */}
      {/* Row 2: Coin Flip  | Perfect 10 */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setInnerTab("milestones")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "milestones"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          🏆 Milestones
        </button>
        <button
          onClick={() => setInnerTab("vip")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "vip"
              ? "bg-purple-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          👑 VIP Pass
        </button>
        <button
          onClick={() => setInnerTab("coinflip")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "coinflip"
              ? "bg-amber-500 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png" alt="coin" className="w-4 h-4" /> Coin Flip
        </button>
        <button
          onClick={() => setInnerTab("perfect10")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            innerTab === "perfect10"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          ⏱️ Perfect 10
        </button>
      </div>

      {/* Milestones */}
      {innerTab === "milestones" && (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
          <EarlyAccessToggle
            user={user}
            onUserUpdate={onUserUpdate}
            totalBookingCount={totalBookingCount}
            showMilestones={true}
          />
        </div>
      )}

      {/* Perfect 10 */}
      {innerTab === "perfect10" && (
        <PerfectTen user={user} onUserUpdate={onUserUpdate} isAdmin={isAdmin} />
      )}

      {/* Coin Flip */}
      {innerTab === "coinflip" && (
        <CoinFlipArena user={user} onUserUpdate={onUserUpdate} isAdmin={isAdmin} />
      )}

      {/* VIP Pass */}
      {innerTab === "vip" && (
        <>
          <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
            <EarlyAccessToggle
              user={user}
              onUserUpdate={onUserUpdate}
              totalBookingCount={totalBookingCount}
              showMilestones={false}
            />
          </div>
          <VipActivityFeed user={user} isAdmin={isAdmin} />
        </>
      )}
    </div>
  );
}