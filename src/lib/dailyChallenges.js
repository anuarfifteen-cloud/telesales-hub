// Ranked Daily Challenges — missions + Mystery Card, reset at Brunei midnight.
//
// State is per-user, per-Brunei-day (DailyChallenge entity). A new day creates a
// fresh record, so challenges and the card reveal reset automatically. Only
// Ranked hand settlement updates `counters`; Casual play never touches this.
//
// Mission/card progress is DERIVED from `counters` by objective type — it is
// never stored per-mission — so a single counter update advances every
// objective that depends on it.
import { base44 } from "@/api/base44Client";
import { bruneiToday } from "./bruneiDay";

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ── 10 daily mission combinations ─────────────────────────────────────
// Each player gets one full combination per Brunei day, chosen at random
// when their daily record is first created. Slot order is fixed:
// 1 = play participation, 2 = win target, 3 = skill (streak or blackjacks).
export const MISSION_COMBINATIONS = [
  [
    { type: "play_ranked", target: 10, reward: 10, label: "Play 10 Ranked hands" },
    { type: "win_ranked", target: 5, reward: 15, label: "Win 5 Ranked hands" },
    { type: "win_streak", target: 5, reward: 25, label: "Reach a 5-game winning streak" },
  ],
  [
    { type: "play_ranked", target: 15, reward: 15, label: "Play 15 Ranked hands" },
    { type: "win_ranked", target: 5, reward: 15, label: "Win 5 Ranked hands" },
    { type: "win_streak", target: 3, reward: 15, label: "Reach a 3-game winning streak" },
  ],
  [
    { type: "play_ranked", target: 12, reward: 12, label: "Play 12 Ranked hands" },
    { type: "win_ranked", target: 10, reward: 25, label: "Win 10 Ranked hands" },
    { type: "blackjacks_ranked", target: 1, reward: 15, label: "Hit 1 Natural Blackjack" },
  ],
  [
    { type: "play_ranked", target: 5, reward: 5, label: "Play 5 Ranked hands" },
    { type: "win_ranked", target: 15, reward: 25, label: "Win 15 Ranked hands" },
    { type: "blackjacks_ranked", target: 2, reward: 25, label: "Hit 2 Natural Blackjacks" },
  ],
  [
    { type: "play_ranked", target: 15, reward: 15, label: "Play 15 Ranked hands" },
    { type: "win_ranked", target: 10, reward: 15, label: "Win 10 Ranked hands" },
    { type: "win_streak", target: 3, reward: 15, label: "Reach a 3-game winning streak" },
  ],
  [
    { type: "play_ranked", target: 5, reward: 5, label: "Play 5 Ranked hands" },
    { type: "win_ranked", target: 20, reward: 35, label: "Win 20 Ranked hands" },
    { type: "blackjacks_ranked", target: 3, reward: 30, label: "Hit 3 Natural Blackjacks" },
  ],
  [
    { type: "play_ranked", target: 12, reward: 12, label: "Play 12 Ranked hands" },
    { type: "win_ranked", target: 5, reward: 15, label: "Win 5 Ranked hands" },
    { type: "win_streak", target: 2, reward: 10, label: "Reach a 2-game winning streak" },
  ],
  [
    { type: "play_ranked", target: 15, reward: 15, label: "Play 15 Ranked hands" },
    { type: "win_ranked", target: 3, reward: 5, label: "Win 3 Ranked hands" },
    { type: "blackjacks_ranked", target: 2, reward: 25, label: "Hit 2 Natural Blackjacks" },
  ],
  [
    { type: "play_ranked", target: 20, reward: 15, label: "Play 20 Ranked hands" },
    { type: "win_ranked", target: 10, reward: 25, label: "Win 10 Ranked hands" },
    { type: "blackjacks_ranked", target: 1, reward: 15, label: "Hit 1 Natural Blackjack" },
  ],
  [
    { type: "play_ranked", target: 15, reward: 15, label: "Play 15 Ranked hands" },
    { type: "win_ranked", target: 5, reward: 15, label: "Win 5 Ranked hands" },
    { type: "win_streak", target: 5, reward: 25, label: "Reach a 5-game winning streak" },
  ],
];

// Mystery Card pool. `instant` cards resolve on reveal; objective cards track
// progress and grant their reward on claim. rank_surge is a rare weighted pick.
export const CARD_POOL = [
  { type: "rank_surge", label: "Rank Surge", desc: "30-Minute 2× Rank Boost!", reward: 0, target: 0, instant: true, weight: 1 },
  { type: "lucky_break", label: "Lucky Break", desc: "+5 Bonus Chips", reward: 5, target: 0, instant: true, weight: 3 },
  { type: "quick_hands", label: "Quick Hands", desc: "Win 2 Ranked hands today", reward: 10, target: 2, weight: 3 },
  { type: "double_down", label: "Double Down", desc: "Win 10 Ranked hands today", reward: 15, target: 10, weight: 3 },
  { type: "streak_hunter", label: "Streak Hunter", desc: "Win 3 consecutive Ranked hands", reward: 10, target: 3, weight: 3 },
];

const EMPTY_COUNTERS = { hands: 0, wins: 0, blackjacks: 0, currentStreak: 0, maxStreak: 0 };

// ── Generation ───────────────────────────────────────────────────────
function generateMissions() {
  const combo =
    MISSION_COMBINATIONS[Math.floor(Math.random() * MISSION_COMBINATIONS.length)];
  return combo.map((m, i) => ({
    slot: i + 1,
    type: m.type,
    target: m.target,
    reward: m.reward,
    label: m.label,
    claimed: false,
    claimedAt: 0,
  }));
}

function pickCard() {
  const total = CARD_POOL.reduce((s, c) => s + (c.weight || 1), 0);
  let r = Math.random() * total;
  for (const c of CARD_POOL) {
    r -= c.weight || 1;
    if (r <= 0) return c;
  }
  return CARD_POOL[0];
}

// ── Progress derivation ──────────────────────────────────────────────
// Mission/card progress is read live from the shared counters.
export function progressFor(type, counters) {
  const c = counters || EMPTY_COUNTERS;
  switch (type) {
    case "play_ranked": return c.hands || 0;
    case "win_ranked": return c.wins || 0;
    case "blackjacks_ranked": return c.blackjacks || 0;
    case "win_streak": return c.maxStreak || 0;
    case "quick_hands":
    case "double_down": return c.wins || 0;
    case "streak_hunter": return c.maxStreak || 0;
    default: return 0;
  }
}

export function isBoostActive(daily) {
  return Number(daily?.rank_surge_expires_at || 0) > Date.now();
}

export function boostMsRemaining(daily) {
  return Math.max(0, Number(daily?.rank_surge_expires_at || 0) - Date.now());
}

// Milliseconds until the next Brunei midnight (UTC+8, no DST).
export function msUntilBruneiMidnight() {
  const bruneiMs = Date.now() + 8 * 3600000;
  const intoDay = bruneiMs % 86400000;
  return 86400000 - intoDay;
}

// ── Chip credit helper ──────────────────────────────────────────────
// Rewards go straight to casinoChips as playable balance. They are NOT added
// to the seasonal winning-payout score (that only comes from Ranked wins).
async function creditChips(user, amount, detail) {
  if (!user?.id || amount <= 0) return;
  const fresh = await base44.auth.me();
  const bal = Number(fresh?.casinoChips) || 0;
  await base44.auth.updateMe({ casinoChips: bal + amount });
  try {
    await base44.entities.CasinoChipLog.create({
      user_id: user.id,
      user_name: fresh?.full_name || user?.full_name || "",
      user_email: fresh?.email || user?.email || "",
      action_type: "admin_add",
      amount,
      balance_after: bal + amount,
      detail,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}

// ── Ensure today's record exists ─────────────────────────────────────
export async function ensureDaily(user) {
  if (!user?.id) return null;
  const day = bruneiToday();
  const page = await base44.entities.DailyChallenge.filter(
    { user_id: user.id, day },
    { limit: 5 }
  );
  const rows = page.items || page || [];
  if (rows.length) return rows[0];
  return await base44.entities.DailyChallenge.create({
    user_id: user.id,
    user_name: user.full_name || user.email || "",
    day,
    missions: generateMissions(),
    mystery_card: { revealed: false, type: null, label: null, desc: null, target: 0, reward: 0, claimed: false, revealedAt: 0, claimedAt: 0 },
    counters: { ...EMPTY_COUNTERS },
    rank_surge_expires_at: 0,
    last_daily_popup_date: "",
  });
}

// ── Record a settled Ranked hand ─────────────────────────────────────
// Called ONLY from Ranked settlement. Casual play never calls this.
// `result` = "win" | "loss" | "push". Returns the updated daily record so the
// caller can read the boost state and double the seasonal payout if active.
export async function recordRankedHand(user, { result, natural }) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  const c = { ...EMPTY_COUNTERS, ...(daily.counters || {}) };
  c.hands = (c.hands || 0) + 1;
  if (result === "win") {
    c.wins = (c.wins || 0) + 1;
    c.currentStreak = (c.currentStreak || 0) + 1;
    c.maxStreak = Math.max(c.maxStreak || 0, c.currentStreak);
    if (natural) c.blackjacks = (c.blackjacks || 0) + 1;
  } else if (result === "loss") {
    c.currentStreak = 0;
  }
  // push leaves the streak intact
  return await base44.entities.DailyChallenge.update(daily.id, { counters: c });
}

// ── Claim a completed mission ───────────────────────────────────────
export async function claimMission(user, slot) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  const m = (daily.missions || []).find((x) => x.slot === slot);
  if (!m || m.claimed) return daily;
  if (progressFor(m.type, daily.counters) < m.target) return daily; // not complete
  await creditChips(user, m.reward, `Daily Mission ${slot} — ${m.label}`);
  const missions = daily.missions.map((x) =>
    x.slot === slot ? { ...x, claimed: true, claimedAt: Date.now() } : x
  );
  return await base44.entities.DailyChallenge.update(daily.id, { missions });
}

// ── Reveal today's Mystery Card ──────────────────────────────────────
// Idempotent: once revealed for the day, returns the existing record.
export async function revealCard(user) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  if (daily.mystery_card?.revealed) return daily;
  const card = pickCard();
  const mc = {
    revealed: true,
    revealedAt: Date.now(),
    type: card.type,
    label: card.label,
    desc: card.desc,
    target: card.target || 0,
    reward: card.reward || 0,
    claimed: false,
    claimedAt: 0,
  };
  const patch = { mystery_card: mc };
  // Instant effects resolve on reveal.
  if (card.type === "lucky_break") {
    await creditChips(user, card.reward, `Mystery Card — Lucky Break (+${card.reward} chips)`);
    mc.claimed = true;
    mc.claimedAt = Date.now();
  } else if (card.type === "rank_surge") {
    patch.rank_surge_expires_at = Date.now() + BOOST_DURATION_MS;
    mc.claimed = true; // effect applied; no separate claim
    mc.claimedAt = Date.now();
  }
  return await base44.entities.DailyChallenge.update(daily.id, patch);
}

// ── Claim an objective Mystery Card's reward ─────────────────────────
// Only for objective cards (quick_hands, double_down, streak_hunter) once done.
export async function claimCardReward(user) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  const mc = daily.mystery_card;
  if (!mc?.revealed || mc.claimed) return daily;
  if (progressFor(mc.type, daily.counters) < (mc.target || 0)) return daily;
  await creditChips(user, mc.reward, `Mystery Card — ${mc.label} (+${mc.reward} chips)`);
  return await base44.entities.DailyChallenge.update(daily.id, {
    mystery_card: { ...mc, claimed: true, claimedAt: Date.now() },
  });
}