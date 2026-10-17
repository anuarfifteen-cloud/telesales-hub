// Blackjack 21 win streaks — the Casual and Ranked tables each keep their own.
//
// Every mode owns three fields on the player's user record:
//   bj21<Mode>WinStreak     the current run of consecutive winning hands
//   bj21<Mode>BestWinStreak the longest run ever reached
//   bj21<Mode>StreakBonuses the milestones (5, 10, 20) this run has already paid
//
// A win extends that mode's run; a loss, a push or a draw ends it; the two runs
// never affect each other. Each milestone pays once per run — chips on both
// tables, and on the Ranked table that same amount again as seasonal 🏆RANK
// points. Casual bonuses are deliberately chips only: the Casual table never
// feeds the season score.
import { base44 } from "@/api/base44Client";
import { addWinPayout } from "./milestone";

const FIELDS = {
  casual: {
    streak: "bj21CasualWinStreak",
    best: "bj21CasualBestWinStreak",
    bonuses: "bj21CasualStreakBonuses",
  },
  ranked: {
    streak: "bj21RankedWinStreak",
    best: "bj21RankedBestWinStreak",
    bonuses: "bj21RankedStreakBonuses",
  },
};

export const STREAK_BONUSES = [
  { streak: 5, chips: 50 },
  { streak: 10, chips: 100 },
  { streak: 20, chips: 250 },
];

const num = (v) => Math.max(0, Number(v) || 0);
const fields = (mode) => FIELDS[mode] || FIELDS.casual;

export function currentStreak(user, mode = "casual") {
  return num(user?.[fields(mode).streak]);
}

export function bestStreak(user, mode = "casual") {
  return num(user?.[fields(mode).best]);
}

function paidMilestones(user, mode) {
  const paid = user?.[fields(mode).bonuses];
  return Array.isArray(paid) ? paid : [];
}

// Every write reads the run back off the record first, so a user object that has
// not refreshed yet can never double-pay a milestone or lose a win.
async function freshUser() {
  return await base44.auth.me();
}

// A won hand: extend that mode's run and pay any milestone reached on this win.
export async function registerWin(mode = "casual", displayName) {
  const f = fields(mode);
  const me = await freshUser();
  const streak = currentStreak(me, mode) + 1;
  const paid = paidMilestones(me, mode);
  const hit = STREAK_BONUSES.filter((b) => streak >= b.streak && !paid.includes(b.streak));
  const bonus = hit.reduce((sum, b) => sum + b.chips, 0);
  const best = Math.max(bestStreak(me, mode), streak);
  const patch = {
    [f.streak]: streak,
    [f.best]: best,
    [f.bonuses]: [...paid, ...hit.map((b) => b.streak)],
  };
  if (bonus > 0) patch.casinoChips = num(me?.casinoChips) + bonus;
  await base44.auth.updateMe(patch);
  // Ranked bonuses also count toward 🏆RANK, paid through the standard milestone
  // helper that keeps the season score and its public leaderboard mirror in step.
  // Casual bonuses stop at the chips credited above — the table is not Ranked,
  // so its milestone rewards never touch the season score.
  if (bonus > 0 && mode === "ranked") {
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
  return { streak, best, bonus, reached: hit.map((b) => b.streak) };
}

// A hand that didn't win — a loss, a push or a draw: that mode's run ends, its
// best-ever mark stays, its milestones re-arm. The other mode is untouched.
export async function registerNonWin(mode = "casual") {
  const f = fields(mode);
  const me = await freshUser();
  if (currentStreak(me, mode) > 0 || paidMilestones(me, mode).length) {
    await base44.auth.updateMe({ [f.streak]: 0, [f.bonuses]: [] });
  }
  return { streak: 0, best: bestStreak(me, mode), bonus: 0, reached: [] };
}