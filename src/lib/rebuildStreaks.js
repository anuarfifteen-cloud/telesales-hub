// Rebuild every player's Ranked best win streak from recorded hand history.
//
// The live tracker used to let a push slide by without ending a run, so saved
// season bests could climb past the truth (a 9 built from two runs separated by
// a push, when the real best was 7). This rebuild walks the Ranked hands the app
// actually saved in Game History, splits them per season using the season close
// timestamps the app recorded, and recomputes each season's longest run of
// consecutive wins. A win extends a run; a loss, a push or a draw ends it.
//
// Safety rules:
//   • Only recorded hands are used — a hand without a saved result ends the run
//     and is reported, never guessed.
//   • Per season, the recomputed best replaces the saved one only when that
//     season's history is complete: otherwise a higher saved value is kept.
//   • Repeatable: running it again changes nothing.
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
    hands.push(...(page.items || []));
    pages += 1;
    onProgress?.(hands.length);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
    if (pages >= MAX_PAGES) truncated = true;
  }
  return { hands, truncated };
}

// Season windows, read from what the app actually recorded: each closed season
// carries the moment it ended (its history row), and the live season starts at
// the latest close or the last reset, whichever is later. Nothing is inferred.
async function loadSeasonWindows(season) {
  const page = await base44.entities.MilestoneSeasonHistory.filter(
    {},
    { sort: "-season_number", limit: 200, fields: ["season_number", "awarded_at"] }
  );
  const closes = (page.items || [])
    .map((r) => ({
      season: Number(r.season_number) || 0,
      at: new Date(r.awarded_at || 0).getTime(),
    }))
    .filter((r) => r.season > 0 && Number.isFinite(r.at) && r.at > 0)
    .sort((a, b) => a.at - b.at);

  const current = Number(season?.season_number) || 1;
  const lastReset = Number(season?.last_reset_at) || 0;

  const windows = closes.map((c, i) => ({
    season: c.season,
    start: i === 0 ? -Infinity : closes[i - 1].at,
    end: c.at,
  }));

  const currentStart = Math.max(
    closes.length ? closes[closes.length - 1].at : -Infinity,
    lastReset
  );

  if (windows.length && windows[windows.length - 1].season === current) {
    // Same season still open (a claimed season that reset is off): keep it whole.
    windows[windows.length - 1].end = Infinity;
  } else {
    windows.push({ season: current, start: currentStart, end: Infinity });
  }
  return { windows, currentSeason: current };
}

function seasonFor(ms, windows) {
  for (const w of windows) {
    if (ms >= w.start && ms < w.end) return w.season;
  }
  return windows[windows.length - 1]?.season ?? 1;
}

async function loadProgressRows(userIds, seasonNumber) {
  const out = [];
  for (const ids of chunk(userIds, CHUNK)) {
    const page = await base44.entities.MilestoneProgress.filter(
      { user_id: { $in: ids }, season_number: seasonNumber },
      {
        limit: 1000,
        fields: ["user_id", "user_name", "season_best_streak", "season_best_streak_at"],
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

// A player's all-time Ranked best lives on their user record — the value the
// Ranked badge and the Stats tab read. Loaded once per rebuild.
async function loadUsers() {
  const page = await base44.entities.User.list({ limit: 500 });
  const rows = page?.items || (Array.isArray(page) ? page : []);
  return new Map(rows.map((u) => [u.id, u]));
}

/**
 * Recompute and correct every player's Ranked best streak — the all-time record
 * on their user record, plus the current and past seasonal records.
 * Returns a report for the admin: what was scanned, what changed, what needs a
 * second look.
 */
export async function rebuildRankedBestStreaks({ onProgress } = {}) {
  const season = await getSeason();
  const { windows, currentSeason } = await loadSeasonWindows(season);
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
  const empty = {
    season: currentSeason,
    hands: hands.length,
    players: 0,
    corrected: [],
    unchanged: 0,
    allTimeCorrected: [],
    allTimeUnchanged: 0,
    flagged: [],
    truncated,
  };
  if (!userIds.length) return empty;

  const progressByUser = new Map(
    (await loadProgressRows(userIds, currentSeason)).map((r) => [r.user_id, r])
  );
  const usersById = await loadUsers();

  // One leaderboard row exists per player per season, so each season's record
  // stays readable after the season rolls over.
  const seasonNumbers = [...new Set(windows.map((w) => w.season))];
  const boardsBySeason = new Map();
  for (const s of seasonNumbers) {
    const rows = await loadBoardRows(userIds, s);
    boardsBySeason.set(s, new Map(rows.map((r) => [r.user_id, r])));
  }

  // Un-attributable hands anywhere mean the history isn't complete enough to
  // lower a saved record.
  const historyIncomplete = truncated || skipped > 0;

  const progressUpdates = [];
  const boardUpdates = [];
  const boardCreates = [];
  const corrected = [];
  const flagged = [];
  let unchanged = 0;
  const userUpdates = [];
  const allTimeCorrected = [];
  let allTimeUnchanged = 0;

  for (const entry of groups.values()) {
    entry.hands.sort((a, b) =>
      String(a.created_date).localeCompare(String(b.created_date))
    );

    // Longest consecutive-win run per season, and across the whole history.
    const runs = new Map();
    let allRun = 0;
    let allBest = 0;
    let allAt = "";
    let allUnknown = 0;
    for (const h of entry.hands) {
      const ms = new Date(h.created_date).getTime();
      const seasonNo = seasonFor(ms, windows);
      const r = runs.get(seasonNo) || { run: 0, best: 0, bestAt: "", count: 0, unknown: 0 };
      r.count += 1;
      const result = String(h.result || "").toLowerCase();
      if (result === "win") {
        r.run += 1;
        allRun += 1;
        if (r.run > r.best) {
          r.best = r.run;
          r.bestAt = h.created_date;
        }
        if (allRun > allBest) {
          allBest = allRun;
          allAt = h.created_date;
        }
      } else {
        if (result !== "loss" && result !== "push") {
          r.unknown += 1;
          allUnknown += 1;
        }
        r.run = 0; // a loss, a push or a draw ends the run
        allRun = 0;
      }
      runs.set(seasonNo, r);
    }

    for (const [seasonNo, r] of runs) {
      const isCurrent = seasonNo === currentSeason;
      const progress = isCurrent ? progressByUser.get(entry.userId) : null;
      const board = boardsBySeason.get(seasonNo)?.get(entry.userId);
      const name = progress?.user_name || board?.user_name || entry.email || "Player";
      if (r.count === 0 || r.best <= 0) continue;

      if (isCurrent && !progress) {
        flagged.push({
          name,
          reason: `No season ${seasonNo} record yet — the ${r.best}-win best streak needs one Ranked hand to appear.`,
        });
        continue;
      }

      const saved = isCurrent
        ? Math.max(0, Number(progress?.season_best_streak) || 0)
        : Math.max(0, Number(board?.best_streak) || 0);

      // With a complete season history the recomputed run is the truth, so it
      // can correct a saved value that was too high. Otherwise only raise.
      const clean = !historyIncomplete && r.unknown === 0;
      const target = clean ? r.best : Math.max(r.best, saved);

      if (!clean) {
        flagged.push({
          name,
          reason: `Season ${seasonNo} history is incomplete${r.unknown ? ` (${r.unknown} hands without a saved result)` : ""} — kept the higher saved record.`,
        });
      }

      if (target === saved) {
        unchanged += 1;
        continue;
      }

      corrected.push({ name, season: seasonNo, from: saved, to: target });
      const at = r.bestAt || new Date().toISOString();

      if (isCurrent) {
        progressUpdates.push({
          id: progress.id,
          season_best_streak: target,
          season_best_streak_at: at,
        });
      }

      if (board) {
        boardUpdates.push({ id: board.id, best_streak: target, best_streak_at: at });
      } else if (isCurrent) {
        boardCreates.push({
          user_id: entry.userId,
          user_name: name,
          season_number: seasonNo,
          score: 0,
          best_streak: target,
          best_streak_at: at,
        });
      }
    }

    // The all-time record on the player's user record — the number the Ranked
    // badge and Stats show. Same rule: a complete history is the truth, an
    // incomplete one may only raise the saved record.
    const user = usersById.get(entry.userId);
    const displayName =
      user?.full_name || entry.email || "Player";
    if (!user) {
      flagged.push({
        name: displayName,
        reason: `No user record found — the all-time best of ${allBest} wins could not be written.`,
      });
    } else {
      const savedAll = Math.max(0, Number(user.bj21RankedBestWinStreak) || 0);
      const cleanAll = !historyIncomplete && allUnknown === 0;
      const targetAll = cleanAll ? allBest : Math.max(allBest, savedAll);
      if (!cleanAll) {
        flagged.push({
          name: displayName,
          reason: `All-time history is incomplete${allUnknown ? ` (${allUnknown} hands without a saved result)` : ""} — kept the higher saved record.`,
        });
      }
      if (targetAll !== savedAll) {
        allTimeCorrected.push({ name: displayName, from: savedAll, to: targetAll, at: allAt });
        userUpdates.push({ id: user.id, value: targetAll });
      } else {
        allTimeUnchanged += 1;
      }
    }
  }

  for (const batch of chunk(progressUpdates, PAGE)) {
    await base44.entities.MilestoneProgress.bulkUpdate(batch);
  }
  for (const batch of chunk(boardUpdates, PAGE)) {
    await base44.entities.MilestoneLeaderboardEntry.bulkUpdate(batch);
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

  let userWriteFailures = 0;
  for (const batch of chunk(userUpdates, 20)) {
    await Promise.all(
      batch.map(async (u) => {
        try {
          await base44.entities.User.update(u.id, { bj21RankedBestWinStreak: u.value });
        } catch {
          userWriteFailures += 1;
        }
      })
    );
  }
  if (userWriteFailures > 0) {
    flagged.push({
      name: "All-time best",
      reason: `${userWriteFailures} player record${userWriteFailures === 1 ? "" : "s"} couldn't be saved — run the rebuild again.`,
    });
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
    season: currentSeason,
    hands: hands.length,
    players: groups.size,
    corrected,
    unchanged,
    allTimeCorrected,
    allTimeUnchanged,
    flagged,
    truncated,
  };
}