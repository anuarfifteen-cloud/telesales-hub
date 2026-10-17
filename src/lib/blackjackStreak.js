// Blackjack 21 win streaks — shared by the Casual and the Ranked table.
//
// The run lives on the player's own user record, so one streak follows them
// across both games and every device:
//   bj21WinStreak     the current run of consecutive winning hands
//   bj21BestWinStreak the longest run ever reached
//   bj21StreakBonuses the milestones (5, 10, 20) this run has already paid
//
// A win extends the run, a loss ends it, a push leaves it untouched. Each
// milestone pays once per run, in chips that also count toward the seasonal
// 🏆RANK score.
import { base44 } from "@/api/base44Client";
import { addWinPayout } from "./milestone";

export const STREAK_BONUSES = [
  { streak: 5, chips: 50 },
  { streak: 10, chips: 100 },
  { streak: 20, chips: 250 },
];

const num = (v) => Math.max(0, Number(v) || 0);

export function currentStreak(user) {
  return num(user?.bj21WinStreak);
}

export function bestStreak(user) {
  return num(user?.bj21BestWinStreak);
}

function paidMilestones(user) {
  return Array.isArray(user?.bj21StreakBonuses) ? user.bj21StreakBonuses : [];
}

// Every write reads the run back off the record first, so a user object that has
// not refreshed yet can never double-pay a milestone or lose a win.
async function freshUser() {
  return await base44.auth.me();
}

// A hand that neither won nor lost — the run is read, never changed.
export async function readStreak() {
  const me = await freshUser();
  return { streak: currentStreak(me), best: bestStreak(me), bonus: 0, reached: [] };
}

// A won hand: extend the run and pay any milestone reached on this win.
export async function registerWin(displayName) {
  const me = await freshUser();
  const streak = currentStreak(me) + 1;
  const paid = paidMilestones(me);
  const hit = STREAK_BONUSES.filter((b) => streak >= b.streak && !paid.includes(b.streak));
  const bonus = hit.reduce((sum, b) => sum + b.chips, 0);
  const patch = {
    bj21WinStreak: streak,
    bj21BestWinStreak: Math.max(bestStreak(me), streak),
    bj21StreakBonuses: [...paid, ...hit.map((b) => b.streak)],
  };
  if (bonus > 0) patch.casinoChips = num(me?.casinoChips) + bonus;
  await base44.auth.updateMe(patch);
  if (bonus > 0) {
    // The bonus counts toward 🏆RANK too, so it pays through the standard
    // milestone helper that keeps the season score and its public leaderboard
    // mirror in step.
    try {
      await addWinPayout(
        me.id,
        displayName || me.full_name || me.email || "Player",
        bonus
      );
    } catch {
      /* the chips are already credited — a score hiccup must not undo them */
    }
  }
  return {
    streak,
    best: patch.bj21BestWinStreak,
    bonus,
    reached: hit.map((b) => b.streak),
  };
}

// A lost hand: the run ends, the best-ever mark stays, milestones re-arm.
export async function registerNonWin() {
  const me = await freshUser();
  if (currentStreak(me) > 0 || paidMilestones(me).length) {
    await base44.auth.updateMe({ bj21WinStreak: 0, bj21StreakBonuses: [] });
  }
  return { streak: 0, best: bestStreak(me), bonus: 0, reached: [] };
}