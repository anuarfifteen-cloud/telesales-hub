// Ranked season win streaks + the Streak Crown (display only, no Diamond).
//
// Streak records are season-scoped: they live on the player's MilestoneProgress
// row and are mirrored onto their public leaderboard row so the 🏆RANK board can
// show "🔥 Best: X Wins" beneath each name. Only Ranked hands touch them — a win
// extends the run, a loss or surrender ends it, and a push or tie leaves it
// exactly as it was. Casual play never reaches this file.
//
// Everything runs client-side (no backend functions on this plan), so duplicate
// payouts are guarded with persisted markers best-effort: simultaneous requests
// from two devices can still race.
import { base44 } from "@/api/base44Client";
import { getSeason, getMyProgress } from "./milestone";

// The season streak leader: the highest best streak wins, and the earliest
// record breaks a tie. A row without a timestamp counts as later.
export function streakLeader(rows) {
  let leader = null;
  for (const r of rows || []) {
    const wins = Math.max(0, Number(r.best_streak) || 0);
    if (wins <= 0) continue;
    const at = r.best_streak_at || "";
    if (
      !leader ||
      wins > leader.wins ||
      (wins === leader.wins && at && (!leader.at || at < leader.at))
    ) {
      leader = { ...r, wins, at };
    }
  }
  return leader;
}

// A settled Ranked hand: "win" extends the run; a loss, a surrender or a push
// ends it, so a run can never be stitched together across a push. Setting a new
// personal best stamps the moment it happened, which decides a tie at season end.
export async function recordSeasonStreak(user, result) {
  if (!user?.id) return null;
  const name = user.full_name || user.email || "";
  const season = await getSeason();
  const progress = await getMyProgress(user.id, name, season.season_number);
  if (!progress) return null;

  const current = Math.max(0, Number(progress.current_streak) || 0);
  const best = Math.max(0, Number(progress.season_best_streak) || 0);
  let nextCurrent = 0;
  let nextBest = best;
  let nextAt = progress.season_best_streak_at || "";

  if (result === "win") {
    nextCurrent = current + 1;
    if (nextCurrent > best) {
      nextBest = nextCurrent;
      nextAt = new Date().toISOString();
    }
  }

  const updated = await base44.entities.MilestoneProgress.update(progress.id, {
    current_streak: nextCurrent,
    season_best_streak: nextBest,
    season_best_streak_at: nextAt,
  });

  // Mirror onto the public leaderboard row so the streak shows under the name.
  // Only once the player has actually won a Ranked hand this season — a run of
  // losses must not put a new player on the board.
  if (nextBest <= 0) return { current: nextCurrent, best: nextBest, at: nextAt };
  try {
    await base44.entities.MilestoneLeaderboardEntry.upsert(
      [
        {
          user_id: user.id,
          user_name: name,
          season_number: Number(season.season_number),
          score: Number(updated?.score) || 0,
          best_streak: nextBest,
          best_streak_at: nextAt,
        },
      ],
      { key: ["user_id", "season_number"] }
    );
  } catch {
    /* best-effort — the streak is already saved on the player's own record */
  }

  return { current: nextCurrent, best: nextBest, at: nextAt };
}

// Season end: record both winners for the closed season. The streak leader is
// read from the season's public streak rows, so it reflects every player, not
// just the champion. One history row per season, never rewritten.
export async function finalizeStreakAward(seasonNumber, champion) {
  const season = Number(seasonNumber) || 0;
  if (!season) return null;

  const existing = await base44.entities.MilestoneSeasonHistory.filter(
    { season_number: season },
    { limit: 1 }
  );
  const found = (existing.items || existing || [])[0];
  if (found) return found;

  const page = await base44.entities.MilestoneLeaderboardEntry.filter(
    { season_number: season },
    {
      limit: 500,
      fields: ["user_id", "user_name", "best_streak", "best_streak_at"],
    }
  );
  const leader = streakLeader(page.items || page || []);

  return await base44.entities.MilestoneSeasonHistory.create({
    season_number: season,
    champion_user_id: champion?.id || "",
    champion_name: champion?.name || "",
    streak_winner_user_id: leader?.user_id || "",
    streak_winner_name: leader?.user_name || "",
    streak_wins: leader?.wins || 0,
    streak_achieved_at: leader?.at || "",
    summary: leader
      ? `${leader.user_name || "A player"} recorded the highest Ranked win streak of the season (${leader.wins} Wins)`
      : "No Ranked win streak was recorded this season.",
    streak_diamond_paid: false,
    streak_diamond_paid_at: "",
    awarded_at: new Date().toISOString(),
  });
}

// No Diamond is paid for the highest streak any more — the crown and the win
// count are shown on the leaderboard only. The Rank 10 grand-prize Diamond
// (first to claim) is untouched.