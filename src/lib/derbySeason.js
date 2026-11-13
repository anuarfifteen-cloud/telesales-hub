import { base44 } from "@/api/base44Client";
import { bruneiToday } from "@/lib/bruneiDay";
import { bruneiMinutes, CLOSE_MINUTES } from "@/lib/horseRacing";
import { placeOf } from "@/lib/derbyFinish";
import { loadMyBet, loadTodayRace } from "@/lib/horseBetApi";

/**
 * Horse Betting seasonal points.
 *
 * Free-tier friendly: there is no scheduled worker, so the season is advanced
 * lazily by whichever player opens Horse Betting after the final day's 23:59
 * cutoff. Points are credited once per race day per player, keyed on the race
 * date inside the player's own score row.
 */

export const MILESTONE_POINTS = 100;
export const POINTS_BY_PLACE = [6, 4, 3, 2, 1, 0];

/** 1st → 6, 2nd → 4, 3rd → 3, 4th → 2, 5th → 1, 6th → 0. */
export function pointsForPlace(place) {
  const p = Number(place);
  return p >= 1 && p <= 6 ? POINTS_BY_PLACE[p - 1] : 0;
}

async function loadOrCreateSeason() {
  const page = await base44.entities.DerbySeason.filter({ status: "active" }, { sort: "-season_number", limit: 1 });
  const found = (page.items || [])[0];
  if (found) return found;

  const latest = await base44.entities.DerbySeason.list({ sort: "-season_number", limit: 1 });
  const next = (Number((latest.items || [])[0]?.season_number) || 0) + 1;
  try {
    await base44.entities.DerbySeason.create({
      season_number: next,
      status: "active",
      started_at: new Date().toISOString(),
    });
  } catch {
    /* another player may have created it at the same moment — reread below */
  }
  const again = await base44.entities.DerbySeason.filter({ status: "active" }, { sort: "-season_number", limit: 1 });
  return (again.items || [])[0] || null;
}

export async function loadSeasonScores(seasonNumber) {
  if (!seasonNumber) return [];
  const page = await base44.entities.DerbyScore.filter({ season_number: seasonNumber }, { sort: "-points", limit: 200 });
  return page.items || [];
}

/** One row per player, highest points first, with a finishing rank. */
export function rankScores(scores = []) {
  const byUser = new Map();
  for (const row of scores) {
    const prev = byUser.get(row.user_id);
    if (!prev || (Number(row.points) || 0) > (Number(prev.points) || 0)) byUser.set(row.user_id, row);
  }
  return [...byUser.values()]
    .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0) || (a.user_name || "").localeCompare(b.user_name || ""))
    .map((row, i) => ({ ...row, points: Number(row.points) || 0, rank: i + 1 }));
}

/** Archives a finished season and opens the next one. Lazy, on first visit after the cutoff. */
async function rolloverIfDue(season) {
  if (!season?.final_day || bruneiToday() <= season.final_day) return season;

  const fresh = await base44.entities.DerbySeason.get(season.id).catch(() => null);
  if (!fresh || fresh.status !== "active") return loadOrCreateSeason();

  const standings = rankScores(await loadSeasonScores(season.season_number)).map((row) => ({
    rank: row.rank,
    user_id: row.user_id,
    user_name: row.user_name || "Player",
    points: row.points,
  }));
  const champion = standings[0];

  await base44.entities.DerbySeasonHistory.create({
    season_number: season.season_number,
    final_day: season.final_day,
    standings,
    champion_id: champion?.user_id || "",
    champion_name: champion?.user_name || "No champion",
    champion_points: champion?.points || 0,
    archived_at: new Date().toISOString(),
  });

  await base44.entities.DerbySeason.update(season.id, { status: "closed", closed_at: new Date().toISOString() });
  return loadOrCreateSeason();
}

/** Credits today's race points once, and marks the season's final day on the first 100. */
async function creditToday(user, season) {
  if (!season || !user?.id) return;
  if (bruneiMinutes() < CLOSE_MINUTES) return;

  const race = await loadTodayRace();
  if (!race?.winning_horse_id || race.status === "cancelled") return;

  const bet = await loadMyBet(race.race_date, user.id);
  if (!bet || bet.status === "pending") return;

  const place = placeOf(race.horses, race.winning_horse_id, bet.horse_id);
  if (!place) return;

  const page = await base44.entities.DerbyScore.filter(
    { user_id: user.id, season_number: season.season_number },
    { limit: 1 }
  );
  const row = (page.items || [])[0];
  if ((row?.awarded_days || []).includes(race.race_date)) return;

  const awarded = [...(row?.awarded_days || []), race.race_date];
  const total = (Number(row?.points) || 0) + pointsForPlace(place);
  const patch = {
    points: total,
    awarded_days: awarded,
    last_award_date: race.race_date,
    updated_at: new Date().toISOString(),
  };

  if (row) await base44.entities.DerbyScore.update(row.id, patch);
  else
    await base44.entities.DerbyScore.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Player",
      season_number: season.season_number,
      diamond_claimed: false,
      ...patch,
    });

  if (total >= MILESTONE_POINTS && !season.final_day) {
    await base44.entities.DerbySeason.update(season.id, { final_day: race.race_date });
  }
}

/** Lazy season heartbeat: archive a finished season, then credit today's points. */
export async function syncDerbySeason(user) {
  const active = await loadOrCreateSeason();
  const season = await rolloverIfDue(active);
  await creditToday(user, season);
  return season;
}

/**
 * Claims the 1 Diamond milestone. The claimant is written and re-read before the
 * wallet is credited, so a simultaneous claim in another tab cannot pay twice.
 */
export async function claimMilestoneDiamond({ user, score }) {
  if (!score) throw new Error("Your season score could not be loaded.");
  if (Number(score.points) < MILESTONE_POINTS) throw new Error("You need 100 points to claim the Diamond.");
  if (score.diamond_claimed) throw new Error("You already claimed this season's Diamond.");

  const fresh = await base44.entities.DerbyScore.get(score.id);
  if (fresh?.diamond_claimed) throw new Error("You already claimed this season's Diamond.");

  const stamp = new Date().toISOString();
  await base44.entities.DerbyScore.update(score.id, {
    diamond_claimed: true,
    diamond_claimed_by: user?.id,
    diamond_claimed_at: stamp,
  });

  const confirmed = await base44.entities.DerbyScore.get(score.id);
  if (confirmed?.diamond_claimed_by !== user?.id) {
    throw new Error("That Diamond was claimed on another device.");
  }

  const me = await base44.auth.me();
  await base44.auth.updateMe({ diamonds: (Number(me?.diamonds) || 0) + 1 });
  return true;
}