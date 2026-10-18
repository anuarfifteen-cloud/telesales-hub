// Historical 🏆RANK totals for the chip ledger.
//
// The season score only moves on a few movements — a Ranked-table win payout and
// the Mystery Card's Direct Drop. Those rows carry a stored `rank_after`
// snapshot, so each one is exact. Everything else left the score untouched, so
// their rank is the same as the newest snapshot above them: walking the ledger
// newest-first from today's total and stepping back over each row's own gain
// gives every entry the rank it had right after it happened.

// How many 🏆RANK points one ledger entry added to the season score.
// Rows written before snapshots existed fall back to the amounts these movements
// are known to pay.
export function rankPointsEarned(entry) {
  const amount = Number(entry.amount) || 0;
  if (entry.mode === "ranked" && entry.action_type === "win") {
    const payout = Number(entry.chips_won);
    return Number.isFinite(payout) && payout > 0 ? payout : amount;
  }
  // Wallet: the Mystery Card's 100-chip Direct Drop also grants 100 rank points.
  if (/Direct Drop/i.test(entry.detail || "")) return 100;
  return 0;
}

// Map each entry id to the season score as it stood right after that entry.
// `rows` must be ordered newest-first, exactly as the ledger reads them. Returns
// an empty map while the current season score is still loading, so no rank shows
// until it is known.
export function buildRankAfterMap(rows, currentScore) {
  const map = {};
  if (!Number.isFinite(currentScore)) return map;
  let running = currentScore;
  for (const entry of rows) {
    const stored = Number(entry.rank_after);
    if (Number.isFinite(stored)) running = stored;
    map[entry.id] = running;
    running -= rankPointsEarned(entry);
  }
  return map;
}