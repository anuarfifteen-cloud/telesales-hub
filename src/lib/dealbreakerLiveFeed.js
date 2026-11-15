import { base44 } from "@/api/base44Client";

/**
 * Dealbreaker Live Activity — the shared "last 5 winnings" feed.
 *
 * Writes go to DealbreakerLiveWin, a shared entity every signed-in player can
 * read (the chip audit log stays private to its owner). A row is written only
 * for a positive chip payout, so the feed never shows a loss or a 0 payout.
 */

/** How many rows the feed shows. */
export const LIVE_WINS_LIMIT = 5;

/** How often the open Dealbreaker screen re-reads the feed. */
export const LIVE_WINS_POLL_MS = 15000;

export const LIVE_WIN_METHOD = {
  vipBuyout: "VIP Buyout",
  finalFolder: "Final Folder",
};

/** True when the player holds an active VIP Pass right now. */
export function isVipAgent(user) {
  const expires = user?.vipExpiresAt ? new Date(user.vipExpiresAt).getTime() : 0;
  return expires > Date.now();
}

/**
 * Records a winning round. Fire-and-forget: a failed write must never affect
 * the payout that already landed in the player's wallet.
 */
export async function recordDealbreakerWin({ user, payout, diamonds = 0, method }) {
  const chips = Number(payout) || 0;
  const gems = Number(diamonds) || 0;
  if (chips <= 0 && gems <= 0) return null; // winnings only
  try {
    return await base44.entities.DealbreakerLiveWin.create({
      user_id: user?.id,
      agent_name: user?.full_name || user?.email?.split("@")[0] || "Agent",
      is_vip: isVipAgent(user),
      payout_chips: chips,
      payout_diamonds: gems,
      win_method:
        method === LIVE_WIN_METHOD.vipBuyout ? LIVE_WIN_METHOD.vipBuyout : LIVE_WIN_METHOD.finalFolder,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("DealbreakerLiveWin write failed:", e);
    return null;
  }
}

/** The five newest wins across all players, newest first. */
export async function loadRecentDealbreakerWins(limit = LIVE_WINS_LIMIT) {
  const page = await base44.entities.DealbreakerLiveWin.list({
    sort: "-created_at",
    limit,
  });
  return page?.items || [];
}

/**
 * Privacy-friendly age label for a win: "Just now", "25 mins ago", "1 hr ago",
 * "2 days ago". Never shows a clock time, so the feed gives away no exact
 * moment a player won.
 */
export function formatWinAge(iso, nowMs = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor(Math.max(0, nowMs - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins === 1 ? "1 min ago" : `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}