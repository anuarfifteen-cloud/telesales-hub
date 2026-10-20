// Rebuild every player's Ranked best win streak from recorded hand history.
//
// The live tracker only advances a streak as hands settle, so hands played
// before it existed (or while it failed) never made it into the season record.
// This rebuild walks the Ranked hands the app actually saved in Game History,
// puts each player's hands in time order, and recalculates their longest run of
// consecutive wins. A win extends a run; a loss, a push or a draw ends it.
//
// Safety rules:
//   • Only recorded hands are used — a hand without a saved result ends the run
//     and is reported, never guessed.
//   • A higher saved streak is never lowered, so running the rebuild again is
//     harmless.
//   • Hand records carry no season stamp, so the recomputed best is credited to
//     the season that is open right now, and any player whose history reaches
//     back before the last reset is listed in the report.
import { base44 } from "@/api/base44Client";
import { getSeason } from "./milestone";

const PAGE = 500;
const MAX_PAGES = 60; // hard stop so a huge history can't loop forever
const CHUNK = 100;

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Every Ranked hand the app has stored. Ranked rows are the Blackjack records
// whose detail starts with "Ranked" (the Casual table writes plain outcomes).
async function loadRankedHands(onProgress) {
  const hands = [];
  let cursor;
  let pages = 0;
  let truncated = false;

  while (pages < MAX_PAGES) {
    const page = await base44.entities.CoinFlipGame.filter(
      { game_type: "blackjack", detail: { $regex: "^Ranked" } },
      {
        sort: "created_date",
        limit: PAGE,
        cursor,
        fields: ["user_id", "user_email", "result", "created_date"],
      }
    );
    const rows = page.items || [];
    hands.push(...rows);
    pages += 1;
    onProgress?.(hands.length);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
    if (pages >= MAX_PAGES) truncated = true;
  }
  return { hands, truncated };
}

async function loadProgressRows(userIds, seasonNumber) {
  const out = [];
  for (const ids of chunk(userIds, CHUNK)) {
    const page = await base44.entities.MilestoneProgress.filter(
      { user_id: { $in: ids }, season_number: seasonNumber },
      {
        limit: 1000,
        fields: [
          "user_id",
          "user_name",
          "season_best_streak",
          "season_best_streak_at",
          "score",
        ],
      }
    );
    out.push(...(page.items || []));
  }
  return out;
}

async function loadBoardRows(userIds, seasonNumber) {
  const out = [];
  for (const ids of chunk(userIds, CHUNK)) {
    const page = await base44.entities.MilestoneLeaderboardEntry.filter(
      { user_id: { $in: ids }, season_number: seasonNumber },
      {
        limit: 1000,
        fields: ["user_id", "user_name", "best_streak", "best_streak_at", "score"],
      }
    );
    out.push(...(page.items || []));
  }
  return out;
}

// Longest run of consecutive wins, with the moment the record run completed.
function longestRun(sortedHands) {
  let run = 0;
  let best = 0;
  let bestAt = "";
  let unknown = 0;
  for (const h of sortedHands) {
    const result = String(h.result || "").toLowerCase();
    if (result === "win") {
      run += 1;
      if (run > best) {
        best = run;
        bestAt = h.created_date || "";
      }
    } else if (result === "loss" || result === "push") {
      run = 0;
    } else {
      // No usable result on the record — the run ends and the hand is reported.
      run = 0;
      unknown += 1;
    }
  }
  return { best, bestAt, unknown };
}

/**
 * Recompute and correct every player's Ranked best streak.
 * Returns a report for the admin: what was scanned, what changed, what needs a
 * second look.
 */
export async function rebuildRankedBestStreaks({ onProgress } = {}) {
  const season = await getSeason();
  const seasonNumber = Number(season?.season_number) || 1;
  const resetAt = Number(season?.last_reset_at) || 0;

  const { hands, truncated } = await loadRankedHands(onProgress);

  // Group by player, keeping hands in time order.
  const groups = new Map();
  let skipped = 0;
  for (const h of hands) {
    if (!h.user_id || !h.created_date) {
      skipped += 1;
      continue;
    }
    const entry =
      groups.get(h.user_id) ||
      { userId: h.user_id, email: h.user_email || "", hands: [] };
    if (!entry.email && h.user_email) entry.email = h.user_email;
    entry.hands.push(h);
    groups.set(h.user_id, entry);
  }

  const userIds = [...groups.keys()];
  if (!userIds.length) {
    return {
      season: seasonNumber,
      hands: hands.length,
      players: 0,
      corrected: [],
      unchanged: 0,
      flagged: [],
      truncated,
    };
  }

  const progressRows = await loadProgressRows(userIds, seasonNumber);
  const progressByUser = new Map(progressRows.map((r) => [r.user_id, r]));
  const boardRows = await loadBoardRows(userIds, seasonNumber);
  const boardByUser = new Map(boardRows.map((r) => [r.user_id, r]));

  const progressUpdates = [];
  const boardUpdates = [];
  const boardCreates = [];
  const corrected = [];
  const flagged = [];
  let unchanged = 0;

  for (const entry of groups.values()) {
    entry.hands.sort((a, b) =>
      String(a.created_date).localeCompare(String(b.created_date))
    );
    const { best, bestAt, unknown } = longestRun(entry.hands);
    const progress = progressByUser.get(entry.userId);
    const name = progress?.user_name || entry.email || "Player";
    const saved = Math.max(0, Number(progress?.season_best_streak) || 0);

    if (!progress) {
      if (best > 0) {
        flagged.push({
          name,
          reason: `No season record yet — ${best}-win best streak needs one Ranked hand to appear.`,
        });
      }
      continue;
    }

    if (unknown > 0) {
      flagged.push({
        name,
        reason: `${unknown} hand${unknown === 1 ? "" : "s"} without a saved result ended a run.`,
      });
    }
    if (resetAt && entry.hands.some((h) => new Date(h.created_date).getTime() < resetAt)) {
      flagged.push({
        name,
        reason: "History reaches back before the last reset — credited to the current season.",
      });
    }

    // Never lower a saved record; only restore a missed higher one.
    if (best <= saved) {
      unchanged += 1;
      continue;
    }

    progressUpdates.push({
      id: progress.id,
      season_best_streak: best,
      season_best_streak_at: bestAt || new Date().toISOString(),
    });
    corrected.push({ name, from: saved, to: best });

    const board = boardByUser.get(entry.userId);
    if (board) {
      boardUpdates.push({
        id: board.id,
        best_streak: best,
        best_streak_at: bestAt || new Date().toISOString(),
      });
    } else {
      boardCreates.push({
        user_id: entry.userId,
        user_name: name,
        season_number: seasonNumber,
        score: Number(progress.score) || 0,
        best_streak: best,
        best_streak_at: bestAt || new Date().toISOString(),
      });
    }
  }

  for (const ids of chunk(progressUpdates, PAGE)) {
    await base44.entities.MilestoneProgress.bulkUpdate(ids);
  }
  for (const ids of chunk(boardUpdates, PAGE)) {
    await base44.entities.MilestoneLeaderboardEntry.bulkUpdate(ids);
  }
  if (boardCreates.length) {
    try {
      await base44.entities.MilestoneLeaderboardEntry.upsert(boardCreates, {
        key: ["user_id", "season_number"],
      });
    } catch {
      flagged.push({
        name: "Leaderboard",
        reason: "Some corrected streaks couldn't be mirrored to the public board.",
      });
    }
  }

  if (skipped > 0) {
    flagged.push({
      name: "History",
      reason: `${skipped} hand record${skipped === 1 ? "" : "s"} missing a player or timestamp were skipped.`,
    });
  }
  if (truncated) {
    flagged.push({
      name: "History",
      reason: "Only the most recent hands were read — run the rebuild again to continue.",
    });
  }

  return {
    season: seasonNumber,
    hands: hands.length,
    players: groups.size,
    corrected,
    unchanged,
    flagged,
    truncated,
  };
}