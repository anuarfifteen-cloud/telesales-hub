// Ranked Daily Challenges + Daily Mystery Card — reset at Brunei midnight.
//
// State is per-user, per-Brunei-day (DailyChallenge entity). A new day creates
// a fresh record, so challenges and the mystery card reset automatically. Only
// Ranked hand settlement updates `counters`; Casual play never touches this.
//
// Mission progress is DERIVED from `counters` by objective type — it is never
// stored per-mission — so a single counter update advances every objective
// that depends on it.
import { base44 } from "@/api/base44Client";
import { bruneiToday } from "./bruneiDay";
import { addWinPayout, fetchSeasonScore } from "./milestone";

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes (2× Rank Surge)
const BETCAP_DURATION_MS = 20 * 60 * 1000; // 20 minutes (High Roller Pass)
const DIRECT_DROP_CHIPS = 100; // chips credited by the Direct Drop card
const DIRECT_DROP_RANK_POINTS = 100; // seasonal 🏆RANK points it also grants

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

// ── Daily Mystery Card rewards ───────────────────────────────────────
// The three outcomes shuffled across the three face-down cards each day.
//   surge_2x   → 30-min 2× Rank Surge (sets rank_surge_expires_at)
//   bet_cap_25 → 20-min High Roller Pass (sets rank_bet_cap_expires_at)
//   chips_100  → 100 chips credited directly, plus 100 seasonal 🏆RANK points
export const MYSTERY_REWARDS = [
  { type: "surge_2x", label: "2× Rank Surge", durationMs: BOOST_DURATION_MS },
  { type: "bet_cap_25", label: "High Roller Pass", durationMs: BETCAP_DURATION_MS },
  { type: "chips_100", label: "Direct Drop", durationMs: 0 },
];

// Fisher–Yates shuffle of the three rewards into the three card slots.
export function shuffleRewards() {
  const arr = [...MYSTERY_REWARDS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

// ── Progress derivation ──────────────────────────────────────────────
// Mission progress is read live from the shared counters.
export function progressFor(type, counters) {
  const c = counters || EMPTY_COUNTERS;
  switch (type) {
    case "play_ranked": return c.hands || 0;
    case "win_ranked": return c.wins || 0;
    case "blackjacks_ranked": return c.blackjacks || 0;
    case "win_streak": return c.maxStreak || 0;
    default: return 0;
  }
}

export function isBoostActive(daily) {
  return Number(daily?.rank_surge_expires_at || 0) > Date.now();
}

export function boostMsRemaining(daily) {
  return Math.max(0, Number(daily?.rank_surge_expires_at || 0) - Date.now());
}

export function isBetCapActive(daily) {
  return Number(daily?.rank_bet_cap_expires_at || 0) > Date.now();
}

export function betCapMsRemaining(daily) {
  return Math.max(0, Number(daily?.rank_bet_cap_expires_at || 0) - Date.now());
}

// Milliseconds until the next Brunei midnight (UTC+8, no DST).
export function msUntilBruneiMidnight() {
  const bruneiMs = Date.now() + 8 * 3600000;
  const intoDay = bruneiMs % 86400000;
  return 86400000 - intoDay;
}

// ── Chip credit helper ──────────────────────────────────────────────
// Mission rewards go straight to casinoChips as playable balance. They are NOT
// added to the seasonal winning-payout score (only the Direct Drop below and
// real Ranked wins are).
async function creditChips(user, amount, detail, rankAfter) {
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
      ...(rankAfter != null ? { rank_after: Number(rankAfter) || 0 } : {}),
      detail,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}

// ── Direct Drop helper ──────────────────────────────────────────────
// The Mystery Card's 100-chip Direct Drop credits 100 playable chips AND 100
// seasonal 🏆RANK points, using the standard milestone helper so the seasonal
// score and the public leaderboard mirror stay consistent with Ranked wins.
async function creditDirectDrop(user, source) {
  // The rank points land first so the ledger row can be stamped with the season
  // total this drop left behind.
  let rankAfter = null;
  try {
    const fresh = await base44.auth.me();
    const name = fresh?.full_name || user?.full_name || user?.email || "";
    await addWinPayout(user.id, name, DIRECT_DROP_RANK_POINTS);
    rankAfter = await fetchSeasonScore(user.id);
  } catch {
    /* best-effort — a milestone hiccup must never block the chip credit */
  }
  await creditChips(user, DIRECT_DROP_CHIPS, `${source} — Direct Drop (+100 chips)`, rankAfter);
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
    counters: { ...EMPTY_COUNTERS },
    daily_mystery_card_status: "unopened",
    daily_mystery_card_selection: -1,
    daily_mystery_card_reward: null,
    bonus_mystery_card_status: "locked",
    bonus_mystery_card_selection: -1,
    bonus_mystery_card_reward: null,
    rank_surge_expires_at: 0,
    rank_bet_cap_expires_at: 0,
    last_mystery_popup_date: "",
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

// ── Reveal today's Daily Mystery Card ────────────────────────────────
// `selection` = chosen card index (0|1|2), `reward` = the reward type at that
// index. Persists the assignment + reveal status + perk expiry in a single
// update BEFORE applying any effect, so a crash mid-reveal can never reroll
// the reward or double-credit chips. Returns the updated daily record.
//   Idempotent: if already revealed today, returns the existing record.
//   "Restart Full Duration": a timed perk always overwrites the expiry with a
//   fresh full-duration window from now, so an already-active same perk resets.
export async function revealMysteryCard(user, selection, reward) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  if (daily.daily_mystery_card_status === "revealed") return daily;
  const now = Date.now();
  const patch = {
    daily_mystery_card_status: "revealed",
    daily_mystery_card_selection: selection,
    daily_mystery_card_reward: reward,
    last_mystery_popup_date: bruneiToday(),
  };
  if (reward === "surge_2x") patch.rank_surge_expires_at = now + BOOST_DURATION_MS;
  else if (reward === "bet_cap_25") patch.rank_bet_cap_expires_at = now + BETCAP_DURATION_MS;
  const updated = await base44.entities.DailyChallenge.update(daily.id, patch);
  // chips_100 effect: +100 chips AND +100 seasonal 🏆RANK points.
  if (reward === "chips_100") {
    await creditDirectDrop(user, "Daily Mystery Card");
  }
  return updated;
}

// ── Bonus Mystery Card (unlocked by claiming every mission) ──────────
// Eligibility is derived, never stored: the bonus card exists only once every
// daily mission has been claimed today, and it never opens automatically.
export function bonusCardUnlocked(daily) {
  const missions = Array.isArray(daily?.missions) ? daily.missions : [];
  return missions.length > 0 && missions.every((m) => m.claimed);
}

// Reveal today's BONUS card. Gated twice: nothing is written unless every
// mission is claimed, and nothing is written if the bonus card was already
// revealed today (so repeated taps or a refresh can never reroll it). The
// assignment + perk expiry are persisted BEFORE any effect is applied.
export async function revealBonusMysteryCard(user, selection, reward) {
  const daily = await ensureDaily(user);
  if (!daily) return null;
  if (daily.bonus_mystery_card_status === "revealed") return daily;
  if (!bonusCardUnlocked(daily)) return daily;
  const now = Date.now();
  const patch = {
    bonus_mystery_card_status: "revealed",
    bonus_mystery_card_selection: selection,
    bonus_mystery_card_reward: reward,
  };
  if (reward === "surge_2x") patch.rank_surge_expires_at = now + BOOST_DURATION_MS;
  else if (reward === "bet_cap_25") patch.rank_bet_cap_expires_at = now + BETCAP_DURATION_MS;
  const updated = await base44.entities.DailyChallenge.update(daily.id, patch);
  // chips_100 effect: +100 chips AND +100 seasonal 🏆RANK points.
  if (reward === "chips_100") await creditDirectDrop(user, "Bonus Mystery Card");
  return updated;
}