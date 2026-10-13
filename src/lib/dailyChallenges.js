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

// ── Objective definitions ────────────────────────────────────────────
// Slot 1 = easy participation; Slot 2 = medium wins; Slot 3 = skill.
export const MISSION_SLOTS = [
  {
    slot: 1,
    type: "play_ranked",
    target: 5,
    reward: 5,
    label: "Play 5 Ranked hands",
  },
  {
    slot: 2,
    pool: [
      { type: "win_ranked", target: 3, reward: 10, label: "Win 3 Ranked hands" },
      { type: "win_ranked", target: 5, reward: 10, label: "Win 5 Ranked hands" },
    ],
  },
  {
    slot: 3,
    pool: [
      { type: "blackjacks_ranked", target: 5, reward: 15, label: "Hit 5 Natural Blackjacks in Ranked" },
      { type: "win_streak", target: 2, reward: 15, label: "Reach a 2-game winning streak in Ranked" },
    ],
  },
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
  const out = [];
  const s1 = MISSION_SLOTS[0];
  out.push({ slot: 1, type: s1.type, target: s1.target, reward: s1.reward, label: s1.label, claimed: false, claimedAt: 0 });
  const m2 = MISSION_SLOTS[1].pool[Math.floor(Math.random() * MISSION_SLOTS[1].pool.length)];
  out.push({ slot: 2, type: m2.type, target: m2.target, reward: m2.reward, label: m2.label, claimed: false, claimedAt: 0 });
  const m3 = MISSION_SLOTS[2].pool[Math.floor(Math.random() * MISSION_SLOTS[2].pool.length)];
  out.push({ slot: 3, type: m3.type, target: m3.target, reward: m3.reward, label: m3.label, claimed: false, claimedAt: 0 });
  return out;
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