// Milestone Progression ("🏆RANK") — seasonal Blackjack winning-payout grind.
//
// Score = total winning chip payouts in the active season (only wins add;
// losses/pushes do not reduce it). Ten ranks gate rewards; Rank 1-9 auto-pop a
// claim popup the moment a new threshold is crossed, and Rank 10 is a single
// Diamond for the first player to claim it. A Diamond claim (when auto-reset
// is on) or an admin manual reset rolls the season forward.
import { base44 } from "@/api/base44Client";
import { bruneiMonthKey } from "./seasonWindow";

export const RANKS = [
  { rank: 1, name: "Chip Apprentice", threshold: 100, chips: 10, tokens: 0 },
  { rank: 2, name: "Deck Reader", threshold: 500, chips: 25, tokens: 0 },
  { rank: 3, name: "Stack Warrior", threshold: 1000, chips: 50, tokens: 0 },
  { rank: 4, name: "Floor Boss", threshold: 3500, chips: 100, tokens: 0 },
  { rank: 5, name: "Jackpot Hunter", threshold: 7500, chips: 100, tokens: 1 },
  { rank: 6, name: "Gold Baron", threshold: 15000, chips: 150, tokens: 1 },
  { rank: 7, name: "Chip Titan", threshold: 35000, chips: 200, tokens: 2 },
  { rank: 8, name: "Casino Legend", threshold: 50000, chips: 250, tokens: 3 },
  { rank: 9, name: "Grandmaster", threshold: 75000, chips: 300, tokens: 5 },
  { rank: 10, name: "Emperor of 21", threshold: 100000, diamond: 1 },
];

export const RANK_10_THRESHOLD = 100000;

// Highest rank reached for a given score (0 if none yet).
export function rankForScore(score) {
  let current = 0;
  for (const r of RANKS) {
    if (Number(score) >= r.threshold) current = r.rank;
  }
  return current;
}

// The next un-reached rank, or null if all reached.
export function nextRank(score) {
  for (const r of RANKS) {
    if (Number(score) < r.threshold) return r;
  }
  return null;
}

export function rankDef(rank) {
  return RANKS.find((r) => r.rank === Number(rank)) || null;
}

// ── Season singleton ───────────────────────────────────────────────
// A season is one Brunei calendar month. `season_month` ("YYYY-MM") is its
// identity: the off-season countdown targets 00:00 Brunei on the 1st of the
// month after it, and the first session to load after that boundary rolls the
// season forward exactly once.

export function isOffSeason(season) {
  return season?.status === "ended" || season?.status === "completed";
}

// The filter carries the state the caller believes is current, so a second
// client acting on stale state matches nothing and changes nothing.
function seasonFilter(season, extra = {}) {
  const filter = { id: season.id, ...extra };
  if (season.season_month) filter.season_month = season.season_month;
  return filter;
}

export async function getSeason() {
  const page = await base44.entities.MilestoneSeason.filter({}, { limit: 10 });
  const rows = page.items || page || [];
  if (!rows.length) {
    return await base44.entities.MilestoneSeason.create({
      season_number: 1,
      season_month: bruneiMonthKey(),
      status: "active",
      diamond_claimed: false,
      diamond_claimed_by: "",
      diamond_claimed_by_name: "",
      diamond_claimed_at: 0,
      season_winner_id: "",
      season_winner_name: "",
      ended_by: "",
      ended_at: 0,
      last_reset_at: 0,
    });
  }

  let season = rows[0];
  // A row written before monthly seasons existed carries no month. Stamp the
  // current Brunei month once so the countdown and rollover have a window.
  if (!season.season_month) {
    season = await base44.entities.MilestoneSeason.update(season.id, {
      season_month: bruneiMonthKey(),
    });
  }

  // First session of a later Brunei month: reopen Ranked. Each player's points
  // and streak reset lazily on their next read (getMyProgress sees the new
  // season_number).
  if (isOffSeason(season) && bruneiMonthKey() > season.season_month) {
    const started = await startNewSeason(season);
    if (started) season = started;
  }
  return season;
}

export async function updateSeason(id, patch) {
  return await base44.entities.MilestoneSeason.update(id, patch);
}

// Open a fresh season for the current Brunei month and bump the identifier so
// every player's progress resets on their next load. Safe to call from several
// sessions at once: only the first write matches the season's current state.
export async function startNewSeason(season) {
  if (!season) return null;
  await base44.entities.MilestoneSeason.updateMany(
    seasonFilter(season, { status: season.status }),
    {
      $set: {
        season_number: Number(season.season_number || 1) + 1,
        season_month: bruneiMonthKey(),
        status: "active",
        diamond_claimed: false,
        diamond_claimed_by: "",
        diamond_claimed_by_name: "",
        diamond_claimed_at: 0,
        season_winner_id: "",
        season_winner_name: "",
        ended_by: "",
        ended_at: 0,
        last_reset_at: Date.now(),
      },
    }
  );
  return await base44.entities.MilestoneSeason.get(season.id);
}

// Close the season and freeze it. Ranked stays locked until 00:00 Brunei on the
// 1st of the next month, or until an admin starts the next season early.
export async function endSeason(season, { winnerId = "", winnerName = "", byDiamond = false } = {}) {
  if (!season) return null;
  const patch = {
    status: "ended",
    ended_at: Date.now(),
    ended_by: byDiamond ? "diamond" : "admin",
  };
  if (winnerId) {
    patch.season_winner_id = winnerId;
    patch.season_winner_name = winnerName || "";
  }
  await base44.entities.MilestoneSeason.updateMany(
    seasonFilter(season, { status: season.status }),
    { $set: patch }
  );
  return await base44.entities.MilestoneSeason.get(season.id);
}

// The player's score for the season active right now. 0 when they have no
// progress row yet, or when their row still belongs to a past season.
export async function fetchSeasonScore(userId) {
  if (!userId) return null;
  const season = await getSeason();
  const page = await base44.entities.MilestoneProgress.filter(
    { user_id: userId },
    { limit: 10, fields: ["score", "season_number"] }
  );
  const row = (page.items || [])[0];
  if (!row || Number(row.season_number) !== Number(season?.season_number)) return 0;
  return Number(row.score) || 0;
}

// ── Per-user progress ──────────────────────────────────────────────

export async function getMyProgress(userId, userName, seasonNumber) {
  if (!userId) return null;
  const page = await base44.entities.MilestoneProgress.filter(
    { user_id: userId },
    { limit: 10 }
  );
  const rows = page.items || page || [];
  if (rows.length) {
    const p = rows[0];
    // Roll over if the global season advanced: reset score + claims, keep
    // pending_rank_rewards (unclaimed rewards from the prior season).
    if (Number(p.season_number) !== Number(seasonNumber)) {
      return await base44.entities.MilestoneProgress.update(p.id, {
        season_number: seasonNumber,
        score: 0,
        claimed_ranks: [],
        // A fresh season starts a fresh streak — past season bests stay on the
        // closed season's leaderboard rows and history record.
        current_streak: 0,
        season_best_streak: 0,
        season_best_streak_at: "",
      });
    }
    return p;
  }
  return await base44.entities.MilestoneProgress.create({
    user_id: userId,
    user_name: userName || "",
    season_number: seasonNumber,
    score: 0,
    claimed_ranks: [],
    pending_rank_rewards: [],
    current_streak: 0,
    season_best_streak: 0,
    season_best_streak_at: "",
    briefing_seen_season: 0,
  });
}

// Mirror the player's public leaderboard-safe fields (name, season, score) into
// the open-read MilestoneLeaderboardEntry entity. Only called on a real Ranked
// win, so the board shows players who actually played this season. Keyed on
// [user_id, season_number] so a new season starts a fresh row per player and
// prior-season rows are ignored by the current-season query. Best-effort: a
// leaderboard sync must never block a Blackjack win.
export async function syncLeaderboardEntry(userId, userName, seasonNumber, score) {
  if (!userId) return;
  try {
    await base44.entities.MilestoneLeaderboardEntry.upsert(
      [
        {
          user_id: userId,
          user_name: userName || "",
          season_number: Number(seasonNumber),
          score: Number(score) || 0,
        },
      ],
      { key: ["user_id", "season_number"] }
    );
  } catch {
    /* best-effort — leaderboard mirror never blocks a win */
  }
}

// Add a winning chip payout to the player's seasonal score and flag any newly
// reached ranks (1-9) so a claim popup can fire. Returns the new ranks.
export async function addWinPayout(userId, userName, chipPayout) {
  if (!userId || Number(chipPayout) <= 0) return null;
  const season = await getSeason();
  const progress = await getMyProgress(userId, userName, season.season_number);
  if (!progress) return null;
  const newScore = Number(progress.score || 0) + Number(chipPayout);
  const claimed = Array.isArray(progress.claimed_ranks) ? progress.claimed_ranks : [];
  const pending = Array.isArray(progress.pending_rank_rewards)
    ? progress.pending_rank_rewards
    : [];
  const newRanks = [];
  for (const r of RANKS) {
    if (r.rank >= 10) continue;
    if (
      newScore >= r.threshold &&
      !claimed.includes(r.rank) &&
      !pending.includes(r.rank)
    ) {
      newRanks.push(r.rank);
    }
  }
  const updated = await base44.entities.MilestoneProgress.update(progress.id, {
    score: newScore,
    pending_rank_rewards: [...pending, ...newRanks],
  });
  // Mirror the new score to the public leaderboard row for this season.
  await syncLeaderboardEntry(userId, userName, season.season_number, newScore);
  return { progress: updated, newRanks };
}

// ── Missed-win reconciliation ──────────────────────────────────────
// A Ranked hand is recorded in Game History the moment it settles, but its
// seasonal score write can be lost (the table used to fire the update without
// awaiting it). These are the verified hands whose points never landed: each is
// looked up in the player's own Game History, paid at its real table rate, and
// credited once. The record id is then kept on MilestoneProgress, so the same
// hand can never be credited twice, however often this runs.
const MISSED_RANKED_HANDS = {
  // 25-chip natural Blackjack, 17 Oct 2026 7:51:59 PM Brunei → 25 × 2.5 = 62.
  "6ad3615f282214fb29355114": { wager: 25, natural: true },
};

export async function reconcileMissedRankedWins(userId, userName, seasonNumber) {
  if (!userId) return null;
  const progress = await getMyProgress(userId, userName, seasonNumber);
  if (!progress) return null;
  const credited = Array.isArray(progress.reconciled_ranked_wins)
    ? progress.reconciled_ranked_wins
    : [];
  const missing = Object.keys(MISSED_RANKED_HANDS).filter((id) => !credited.includes(id));
  if (!missing.length) return null;

  // Only credit a hand that really belongs to this player. Marking the ids as
  // reconciled either way stops the lookup repeating on every future read.
  const page = await base44.entities.CoinFlipGame.filter(
    { user_id: userId, id: { $in: missing } },
    { limit: 20 }
  );
  const rows = page.items || [];
  const gained = rows.reduce((sum, row) => {
    const spec = MISSED_RANKED_HANDS[row.id];
    if (!spec) return sum;
    return sum + (spec.natural ? Math.floor(spec.wager * 2.5) : spec.wager * 2);
  }, 0);

  const newScore = Number(progress.score || 0) + gained;
  const updated = await base44.entities.MilestoneProgress.update(progress.id, {
    score: newScore,
    reconciled_ranked_wins: [...credited, ...missing],
  });
  if (gained > 0) {
    await syncLeaderboardEntry(
      userId,
      userName || progress.user_name,
      seasonNumber,
      newScore
    );
  }
  return { progress: updated, gained };
}

// Claim a Rank 1-9 reward: credit chips + tokens, mark claimed, drop from pending.
export async function claimRankReward(userId, rank) {
  const def = rankDef(rank);
  if (!def || def.rank >= 10) return null;
  const season = await getSeason();
  const progress = await getMyProgress(userId, "", season.season_number);
  if (!progress) return null;
  const pending = Array.isArray(progress.pending_rank_rewards)
    ? progress.pending_rank_rewards
    : [];
  const claimed = Array.isArray(progress.claimed_ranks) ? progress.claimed_ranks : [];
  if (!pending.includes(def.rank) || claimed.includes(def.rank)) return null;

  const fresh = await base44.auth.me();
  const chipBal = Number(fresh?.casinoChips) || 0;
  const tokenBal = Number(fresh?.earlyAccessTokens) || 0;
  const name = fresh?.full_name || fresh?.email || "";
  const updates = {};
  if (def.chips) updates.casinoChips = chipBal + def.chips;
  if (def.tokens) updates.earlyAccessTokens = tokenBal + def.tokens;
  if (Object.keys(updates).length) await base44.auth.updateMe(updates);

  if (def.chips) {
    try {
      await base44.entities.CasinoChipLog.create({
        user_id: userId,
        user_name: name,
        user_email: fresh?.email || "",
        action_type: "admin_add",
        amount: def.chips,
        balance_after: chipBal + def.chips,
        detail: `Milestone Rank ${def.rank} — ${def.name} reward`,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }
  if (def.tokens) {
    try {
      await base44.entities.TokenTransaction.create({
        user_id: userId,
        user_name: name,
        amount: def.tokens,
        source: `Milestone Rank ${def.rank} — ${def.name}`,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  return await base44.entities.MilestoneProgress.update(progress.id, {
    claimed_ranks: [...claimed, def.rank],
    pending_rank_rewards: pending.filter((r) => r !== def.rank),
  });
}

// Claim the Rank 10 Diamond. The claim itself ENDS the season: the conditional
// write only lands while the season is still active and unclaimed, then the
// claimant is re-read to confirm they hold it before any Diamond is credited.
export async function claimDiamond(userId, userName) {
  if (!userId) return { error: "no user" };
  const season = await getSeason();
  if (isOffSeason(season)) {
    return {
      already: true,
      by: season.season_winner_name || season.diamond_claimed_by_name,
    };
  }
  if (season.diamond_claimed) return { already: true, by: season.diamond_claimed_by_name };

  await base44.entities.MilestoneSeason.updateMany(
    seasonFilter(season, { status: "active", diamond_claimed: false }),
    {
      $set: {
        status: "ended",
        diamond_claimed: true,
        diamond_claimed_by: userId,
        diamond_claimed_by_name: userName || "",
        diamond_claimed_at: Date.now(),
        season_winner_id: userId,
        season_winner_name: userName || "",
        ended_at: Date.now(),
        ended_by: "diamond",
      },
    }
  );

  // Confirm we are the recorded claimant (handles a simultaneous race).
  const fresh = await base44.entities.MilestoneSeason.get(season.id);
  if (fresh.diamond_claimed_by !== userId) {
    return { already: true, by: fresh.diamond_claimed_by_name, lost: true };
  }

  // Credit 1 Diamond to the wallet.
  const me = await base44.auth.me();
  const diam = Number(me?.diamonds) || 0;
  await base44.auth.updateMe({ diamonds: diam + 1 });
  try {
    await base44.entities.TokenTransaction.create({
      user_id: userId,
      user_name: me?.full_name || me?.email || "",
      amount: 0,
      source: `Milestone Rank 10 — ${fresh.diamond_claimed_by_name || ""} claimed the Emperor Diamond`,
      timestamp: new Date().toISOString(),
    });
  } catch {}

  return { claimed: true, season: fresh };
}