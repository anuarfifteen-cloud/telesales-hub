// Ranked season win streaks + the season-end 💎 Streak Crown.
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

// A settled Ranked hand: "win" extends the run, "loss" (or a surrender) resets
// it, "push" leaves it untouched. Setting a new personal best stamps the moment
// it happened, which is what decides a tie at season end.
export async function recordSeasonStreak(user, result) {
  if (!user?.id || result === "push") return null;
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
      ? `${leader.user_name || "A player"} won 💎 1 Diamond for Highest Season Streak (${leader.wins} Wins)`
      : "No Ranked win streak was recorded — no streak Diamond awarded.",
    streak_diamond_paid: false,
    streak_diamond_paid_at: "",
    awarded_at: new Date().toISOString(),
  });
}

// The Streak King collects their Diamond the next time they open the RANK
// area. The paid marker is written first and read back, so only the writer that
// still sees its own stamp credits the Diamond — a reload or a second device
// can't pay it again.
export async function payPendingStreakDiamond(user) {
  if (!user?.id) return null;
  const season = await getSeason();
  const seasonNumber = Number(season?.season_number) || 0;

  const page = await base44.entities.MilestoneSeasonHistory.filter(
    { streak_winner_user_id: user.id, streak_diamond_paid: false },
    { limit: 10 }
  );
  const rows = (page.items || page || []).filter((r) => {
    if (Number(r.streak_wins) <= 0) return false;
    const n = Number(r.season_number) || 0;
    // A closed season: either the season has rolled on, or the claim ended it
    // while auto-reset is off.
    return n < seasonNumber || (n === seasonNumber && season?.status === "completed");
  });
  if (!rows.length) return null;

  const row = rows.sort((a, b) => Number(a.season_number) - Number(b.season_number))[0];
  const stamp = new Date().toISOString();

  await base44.entities.MilestoneSeasonHistory.update(row.id, {
    streak_diamond_paid: true,
    streak_diamond_paid_at: stamp,
  });
  const confirm = await base44.entities.MilestoneSeasonHistory.get(row.id);
  if (!confirm?.streak_diamond_paid || confirm.streak_diamond_paid_at !== stamp) {
    return null;
  }

  try {
    const me = await base44.auth.me();
    await base44.auth.updateMe({ diamonds: (Number(me?.diamonds) || 0) + 1 });
  } catch (err) {
    // Put the marker back so a later visit can retry the award.
    try {
      await base44.entities.MilestoneSeasonHistory.update(row.id, {
        streak_diamond_paid: false,
        streak_diamond_paid_at: "",
      });
    } catch {}
    throw err;
  }

  return { season: Number(row.season_number), wins: Number(row.streak_wins) };
}