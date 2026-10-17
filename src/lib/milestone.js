// Milestone Progression ("🏆RANK") — seasonal Blackjack winning-payout grind.
//
// Score = total winning chip payouts in the active season (only wins add;
// losses/pushes do not reduce it). Ten ranks gate rewards; Rank 1-9 auto-pop a
// claim popup the moment a new threshold is crossed, and Rank 10 is a single
// Diamond for the first player to claim it. A Diamond claim (when auto-reset
// is on) or an admin manual reset rolls the season forward.
import { base44 } from "@/api/base44Client";

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

export async function getSeason() {
  const page = await base44.entities.MilestoneSeason.filter({}, { limit: 10 });
  const rows = page.items || page || [];
  if (rows.length) return rows[0];
  return await base44.entities.MilestoneSeason.create({
    season_number: 1,
    status: "active",
    diamond_claimed: false,
    diamond_claimed_by: "",
    diamond_claimed_by_name: "",
    diamond_claimed_at: 0,
    auto_reset_enabled: true,
    last_reset_at: 0,
  });
}

export async function updateSeason(id, patch) {
  return await base44.entities.MilestoneSeason.update(id, patch);
}

// Roll the season forward. Per-user progress resets lazily on next read
// (getMyProgress detects the season_number mismatch).
export async function resetSeason() {
  const season = await getSeason();
  const newNumber = Number(season.season_number) + 1;
  return await base44.entities.MilestoneSeason.update(season.id, {
    season_number: newNumber,
    status: "active",
    diamond_claimed: false,
    diamond_claimed_by: "",
    diamond_claimed_by_name: "",
    diamond_claimed_at: 0,
    last_reset_at: Date.now(),
  });
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

// Claim the Rank 10 Diamond. Best-effort first-claim-wins: update the season,
// re-read, and only the player whose id sticks as diamond_claimed_by gets the
// Diamond (and triggers the reset when auto_reset_enabled).
export async function claimDiamond(userId, userName) {
  if (!userId) return { error: "no user" };
  const season = await getSeason();
  if (season.diamond_claimed) return { already: true, by: season.diamond_claimed_by_name };

  await base44.entities.MilestoneSeason.update(season.id, {
    diamond_claimed: true,
    diamond_claimed_by: userId,
    diamond_claimed_by_name: userName || "",
    diamond_claimed_at: Date.now(),
    status: "completed",
  });

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

  if (season.auto_reset_enabled) {
    await resetSeason();
  }
  return { claimed: true, season: fresh };
}