import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import EarlyAccessToggle from "@/components/profile/EarlyAccessToggle";
import CoinFlipStreak from "@/components/coinflip/CoinFlipStreak";
import PerfectTen from "@/components/coinflip/PerfectTen";
import VipActivityFeed from "@/components/coinflip/VipActivityFeed";
import NinjaTokenGame from "@/components/games/NinjaTokenGame";
import SuperTapGame from "@/components/supertap/SuperTapGame";
import BlindVoucherShop from "@/components/tokens/BlindVoucherShop";
import FlappyTokenGame from "@/components/games/FlappyTokenGame";
import DiamondSmashGame from "@/components/games/DiamondSmashGame";
import DiamondBalanceCard from "@/components/tokens/DiamondBalanceCard";
import Blackjack21Game from "@/components/casino21/Blackjack21Game";
import HorseBettingView from "@/components/horseBetting/HorseBettingView";
import ScratchCardGame from "@/components/scratchcard/ScratchCardGame";
import TheCloserGame from "@/components/closer/TheCloserGame";
import DailyChipGiftModal, { chipGiftClaimedToday } from "@/components/casino21/DailyChipGiftModal";
import TokensCatalog, { GAME_TITLES } from "@/components/tokens/TokensCatalog";
import BackToCatalog from "@/components/tokens/BackToCatalog";
import { getRankedSignal, onRankedNavRequest } from "@/lib/rankedNav";

export default function TokensTab({ user, onUserUpdate, totalBookingCount, isAdmin, ninjaEnabled = true, scratchCardEnabled = true, horseBettingEnabled = false, oneVOneRequest = 0 }) {
  // "catalog" is the game shelf; any other value opens that game or tool.
  const [innerTab, setInnerTab] = useState("catalog");
  // "View" on a new-challenge alert: land on the Blackjack 21 sub-tab, which
  // then opens its 1V1 board.
  useEffect(() => {
    if (oneVOneRequest > 0) setInnerTab("blackjack21");
  }, [oneVOneRequest]);
  // Cross-tree "GO TO RANKED NOW": land on the Blackjack 21 sub-tab. Reacts
  // once per signal (checks on mount for a signal fired before this tab
  // mounted, then subscribes for later ones).
  useEffect(() => {
    let last = getRankedSignal();
    const react = (s) => {
      if (s > last) {
        last = s;
        setInnerTab("blackjack21");
      }
    };
    react(getRankedSignal());
    return onRankedNavRequest(react);
  }, []);

  // Daily 5-chip gift: offered once per Brunei day. Checked on every visit to
  // the Tokens tab — dismissing the popup leaves the gift unclaimed, so it
  // shows again the next time the tab is opened.
  const [showChipGift, setShowChipGift] = useState(false);
  useEffect(() => {
    let active = true;
    base44.auth
      .me()
      .then((fresh) => {
        if (active && fresh && !chipGiftClaimedToday(fresh)) setShowChipGift(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // ninjaEnabled is preloaded by Home (via AppSettings subscription) so the tab
  // is already resolved by the time the user switches here — no 1s pop-in.
  // Avoid lingering on the Ninja tab if it gets hidden later
  useEffect(() => {
    if (!ninjaEnabled && innerTab === "ninja") setInnerTab("catalog");
  }, [ninjaEnabled, innerTab]);

  // Scratch Card is completely hidden from players while the admin keeps it
  // switched off — no card in the catalog and no placeholder. An unlocked admin
  // still sees it and can open the game as usual.
  const scratchAccess = scratchCardEnabled || isAdmin;

  useEffect(() => {
    if (!scratchAccess && innerTab === "scratchcard") setInnerTab("catalog");
  }, [scratchAccess, innerTab]);

  // Horse Betting is hidden from players until an admin opens it up to
  // everyone; an unlocked admin always keeps access to its own tab.
  const horseAccess = horseBettingEnabled || isAdmin;

  useEffect(() => {
    if (!horseAccess && innerTab === "horseracing") setInnerTab("catalog");
  }, [horseAccess, innerTab]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {innerTab === "catalog" ? (
        <TokensCatalog
          user={user}
          onOpen={setInnerTab}
          ninjaEnabled={ninjaEnabled}
          scratchAccess={scratchAccess}
          horseAccess={horseAccess}
        >
          <DiamondBalanceCard user={user} onUserUpdate={onUserUpdate} />
        </TokensCatalog>
      ) : (
        <BackToCatalog title={GAME_TITLES[innerTab] || ""} onBack={() => setInnerTab("catalog")} />
      )}

      {/* Milestones */}
      {innerTab === "milestones" && (
        <>
          <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
            <EarlyAccessToggle
              user={user}
              onUserUpdate={onUserUpdate}
              totalBookingCount={totalBookingCount}
              showMilestones={true}
            />
          </div>
        </>
      )}

      {/* Perfect 10 */}
      {innerTab === "perfect10" && (
        <PerfectTen user={user} onUserUpdate={onUserUpdate} isAdmin={isAdmin} />
      )}

      {/* Coin Flip */}
      {innerTab === "coinflip" && (
        <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
          <CoinFlipStreak user={user} onUserUpdate={onUserUpdate} />
        </div>
      )}

      {/* Blackjack 21 */}
      {innerTab === "blackjack21" && (
        <Blackjack21Game
          user={user}
          onUserUpdate={onUserUpdate}
          oneVOneRequest={oneVOneRequest}
        />
      )}

      {/* Daily Horse Betting */}
      {innerTab === "horseracing" && horseAccess && (
        <HorseBettingView user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Premium Scratch Card */}
      {innerTab === "scratchcard" && scratchAccess && (
        <div className="w-full max-w-md mx-auto">
          <ScratchCardGame user={user} onUserUpdate={onUserUpdate} />
        </div>
      )}

      {/* The Closer */}
      {innerTab === "closer" && (
        <TheCloserGame user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Ninja Slice (only when enabled) */}
      {ninjaEnabled && innerTab === "ninja" && (
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

      {/* Daily 5 free chips */}
      <DailyChipGiftModal
        user={user}
        open={showChipGift}
        onClose={() => setShowChipGift(false)}
        onClaimed={onUserUpdate}
      />
    </div>
  );
}