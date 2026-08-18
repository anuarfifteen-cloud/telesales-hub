import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";
import CoinFlipArena from "@/components/coinflip/CoinFlipArena";
import PerfectTen from "@/components/coinflip/PerfectTen";
import VipActivityFeed from "@/components/coinflip/VipActivityFeed";
import NinjaTokenGame from "@/components/games/NinjaTokenGame";
import SuperTapGame from "@/components/supertap/SuperTapGame";
import BlindVoucherShop from "@/components/tokens/BlindVoucherShop";
import FlappyTokenGame from "@/components/games/FlappyTokenGame";
import DiamondSmashGame from "@/components/games/DiamondSmashGame";
import DiamondBalanceCard from "@/components/tokens/DiamondBalanceCard";

export default function TokensTab({ user, onUserUpdate, totalBookingCount, isAdmin }) {
  const [innerTab, setInnerTab] = useState("milestones");
  // tabs: milestones | vip | duo | perfect10 | coinflip
  const tokens = user?.earlyAccessTokens ?? 0;

  // Ninja Token availability — controlled by admin via HubSettings singleton
  const [ninjaActive, setNinjaActive] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const loadNinjaSetting = useCallback(async () => {
    try {
      const rows = await base44.entities.HubSettings.list();
      setNinjaActive(!!rows[0]?.isNinjaTokenActive);
    } catch (e) {
      console.error("[TokensTab] HubSettings load failed:", e?.message || e);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNinjaSetting();
    const unsub = base44.entities.HubSettings.subscribe(() => loadNinjaSetting());
    return unsub;
  }, [loadNinjaSetting]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Token Balance Card */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Token Balance</span>
            <span className="text-3xl font-black text-foreground">{tokens}</span>
            <span className="text-xs text-muted-foreground">tokens available</span>
          </div>
          <img
            src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png"
            alt="token"
            className="w-14 h-14 object-contain"
          />
        </div>

        {/* Diamond Balance Card */}
        <DiamondBalanceCard user={user} onUserUpdate={onUserUpdate} />
      </div>

      {/* Row 1: Milestones | VIP Pass | Daily Quiz */}
      {/* Row 2: Coin Flip  | Perfect 10 */}
      <div className="flex flex-col gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-1">
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
          <div className="relative">
            <button
              onClick={() => (ninjaActive ? setInnerTab("ninja") : undefined)}
              disabled={!ninjaActive || settingsLoading}
              className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                ninjaActive
                  ? innerTab === "ninja"
                    ? "bg-pink-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  : "opacity-50 cursor-not-allowed text-slate-400 bg-slate-200 dark:bg-slate-700"
              }`}
            >
              🥷 Ninja Token
            </button>
            {!settingsLoading && !ninjaActive && (
              <span className="absolute top-0 right-0 translate-x-2 -translate-y-2 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-purple-400">
                COMING SOON
              </span>
            )}
          </div>
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-3 gap-1">
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
          <button
            onClick={() => setInnerTab("supertap")}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              innerTab === "supertap"
                ? "bg-red-500 text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            ⚡ Super Tap
          </button>
        </div>
        {/* Row 3 */}
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setInnerTab("blindvoucher")}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              innerTab === "blindvoucher"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            🎟️ Blind Voucher
          </button>
          <button
            onClick={() => setInnerTab("flappy")}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              innerTab === "flappy"
                ? "bg-cyan-500 text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            🐦 Flappy Token
          </button>
          <button
            onClick={() => setInnerTab("diamondsmash")}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              innerTab === "diamondsmash"
                ? "bg-fuchsia-600 text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            💎 Diamond Smash
          </button>
        </div>
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

      {/* Ninja Token Game — only render when enabled via HubSettings */}
      {innerTab === "ninja" && ninjaActive && (
        <NinjaTokenGame user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Super Tap */}
      {innerTab === "supertap" && (
        <SuperTapGame user={user} />
      )}

      {/* Blind Voucher */}
      {innerTab === "blindvoucher" && (
        <BlindVoucherShop user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Flappy Token */}
      {innerTab === "flappy" && (
        <FlappyTokenGame user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Diamond Smash */}
      {innerTab === "diamondsmash" && (
        <DiamondSmashGame user={user} onUserUpdate={onUserUpdate} />
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
          {isAdmin && <VipActivityFeed user={user} isAdmin={isAdmin} />}
        </>
      )}
    </div>
  );
}