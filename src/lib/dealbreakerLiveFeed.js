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
export async function recordDealbreakerWin({ user, payout, method }) {
  const chips = Number(payout) || 0;
  if (chips <= 0) return null; // winnings only
  try {
    return await base44.entities.DealbreakerLiveWin.create({
      user_id: user?.id,
      agent_name: user?.full_name || user?.email?.split("@")[0] || "Agent",
      is_vip: isVipAgent(user),
      payout_chips: chips,
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

const BRUNEI_STAMP = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Brunei",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const BRUNEI_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Brunei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Brunei-time label for a win. Today → "8:28 PM"; an earlier Brunei date →
 * "15 Nov, 8:28 PM". Always read in Asia/Brunei, never the device timezone.
 */
export function formatBruneiWinStamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = {};
  for (const part of BRUNEI_STAMP.formatToParts(date)) parts[part.type] = part.value;
  const clock = `${parts.hour}:${parts.minute} ${(parts.dayPeriod || "").toUpperCase()}`.trim();
  const isToday = BRUNEI_DAY.format(date) === BRUNEI_DAY.format(new Date());
  return isToday ? clock : `${parts.day} ${parts.month}, ${clock}`;
}