import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import {
  generateOdds,
  grossPayout,
  isBettingOpen,
  pickWinningHorseId,
  STAKE_OPTIONS,
  todayKey,
} from "@/lib/horseRacing";

/**
 * Daily Horse Racing data operations.
 *
 * Every shared-wallet movement is deliberately sequential and every ambiguous
 * outcome is left in an explicit status for the admin recovery tab, because
 * the balance write and the bet record can never be updated atomically.
 */

/** The day's shared race. Creates it once (odds + winner) if nobody has yet. */
export async function loadTodayRace() {
  const raceDate = todayKey();
  const first = await base44.entities.HorseRace.filter(
    { race_date: raceDate },
    { sort: "created_date", limit: 1 }
  );
  const found = (first.items || [])[0];
  if (found) return found;

  try {
    await base44.entities.HorseRace.create({
      race_date: raceDate,
      status: "betting",
      horses: generateOdds(),
      winning_horse_id: pickWinningHorseId(),
      result_saved_at: new Date().toISOString(),
    });
  } catch {
    /* another client may have created it first — reread below */
  }

  const again = await base44.entities.HorseRace.filter(
    { race_date: raceDate },
    { sort: "created_date", limit: 1 }
  );
  return (again.items || [])[0] || null;
}

export async function loadMyBet(raceDate, userId) {
  if (!userId) return null;
  const page = await base44.entities.HorseBet.filter(
    { race_date: raceDate, user_id: userId },
    { sort: "created_date", limit: 1 }
  );
  return (page.items || [])[0] || null;
}

/**
 * Place the day's single bet.
 *
 * Order: duplicate check → pending bet row → chip deduction → confirmed row →
 * chip log. A failed deduction marks the row review_required instead of
 * retrying, so a repeated press can never charge twice silently.
 */
export async function placeBet({ user, race, horseId, stake }) {
  if (!STAKE_OPTIONS.includes(Number(stake))) throw new Error("Choose a 50 or 100 chip stake.");
  if (!isBettingOpen()) throw new Error("Betting for today has closed.");

  const existing = await loadMyBet(race.race_date, user.id);
  if (existing) return { bet: existing, duplicate: true };

  const fresh = await base44.auth.me();
  const before = Number(fresh?.casinoChips) || 0;
  if (before < stake) throw new Error("You do not have enough chips for this bet.");

  const horse = (race.horses || []).find((h) => h.id === horseId);
  const pending = await base44.entities.HorseBet.create({
    race_date: race.race_date,
    race_id: race.id,
    user_id: user.id,
    user_name: user.full_name || user.email?.split("@")[0] || "Player",
    horse_id: horseId,
    horse_number: horse?.number || 0,
    horse_name: horse?.name || "",
    stake: Number(stake),
    gross_payout: grossPayout(stake),
    status: "pending",
    balance_before: before,
  });

  try {
    await base44.auth.updateMe({ casinoChips: before - stake });
  } catch (e) {
    await base44.entities.HorseBet.update(pending.id, {
      status: "review_required",
      note: "Chip deduction did not confirm — check the balance before resolving.",
    }).catch(() => {});
    throw new Error("Your bet could not be confirmed. An admin will check it — no need to retry.");
  }

  const balanceAfter = before - stake;
  const confirmed = await base44.entities.HorseBet.update(pending.id, {
    status: "confirmed",
    balance_after: balanceAfter,
    confirmed_at: new Date().toISOString(),
  });

  logChipMovement({
    user,
    mode: "wallet",
    action_type: "bet",
    amount: -stake,
    balance_after: balanceAfter,
    detail: `Horse Racing bet ${stake} on #${horse?.number} ${horse?.name}`,
  });

  return { bet: confirmed, duplicate: false };
}

/** Winner with a verified stake can collect the fixed gross payout, once. */
export async function collectPayout({ user, bet }) {
  const payout = Number(bet.gross_payout) || grossPayout(bet.stake);

  // Claim mark first: a second press can see claim_pending and stop.
  await base44.entities.HorseBet.update(bet.id, { status: "claim_pending" });

  const fresh = await base44.auth.me();
  const before = Number(fresh?.casinoChips) || 0;

  try {
    await base44.auth.updateMe({ casinoChips: before + payout });
  } catch {
    // The credit may or may not have landed — never retry automatically.
    throw new Error("Collection was interrupted. An admin will verify it — don't collect again.");
  }

  const balanceAfter = before + payout;
  const paid = await base44.entities.HorseBet.update(bet.id, {
    status: "paid",
    balance_after: balanceAfter,
    paid_at: new Date().toISOString(),
  });

  logChipMovement({
    user,
    mode: "wallet",
    action_type: "win",
    amount: payout,
    balance_after: balanceAfter,
    chips_won: payout,
    detail: `Horse Racing payout ${payout} on #${bet.horse_number} ${bet.horse_name}`,
  });

  return paid;
}

/** Lazy loss marking once the day's result is visible. Best-effort only. */
export async function markLost(bet, winnerId) {
  if (!bet || bet.status !== "confirmed" || bet.horse_id === winnerId) return bet;
  try {
    return await base44.entities.HorseBet.update(bet.id, { status: "lost" });
  } catch {
    return bet;
  }
}

/**
 * Administrator resolution. `action` is one of:
 *   pay_payout | mark_paid | refund_stake | mark_refunded | resolve_none
 */
export async function adminResolveBet({ adminUser, bet, action, currentBalance, reason }) {
  const stamp = new Date().toISOString();
  const note = `${action} by ${adminUser?.full_name || "admin"}${reason ? ` — ${reason}` : ""}`;

  const creditChips = async (amount) => {
    const target = Number(currentBalance) || 0;
    await base44.entities.User.update(bet.user_id, { casinoChips: target + amount });
    return target + amount;
  };

  if (action === "pay_payout") {
    const amount = Number(bet.gross_payout) || grossPayout(bet.stake);
    const balanceAfter = await creditChips(amount);
    logChipMovement({
      user: { id: bet.user_id, full_name: bet.user_name },
      mode: "wallet",
      action_type: "admin_add",
      amount,
      balance_after: balanceAfter,
      chips_won: amount,
      detail: `Horse Racing payout (admin verified) ${amount}`,
      adminUser,
    });
    return base44.entities.HorseBet.update(bet.id, {
      status: "paid",
      balance_after: balanceAfter,
      paid_at: stamp,
      note,
      resolved_by: adminUser?.full_name || "admin",
    });
  }

  if (action === "refund_stake") {
    const amount = Number(bet.stake) || 0;
    const balanceAfter = await creditChips(amount);
    logChipMovement({
      user: { id: bet.user_id, full_name: bet.user_name },
      mode: "wallet",
      action_type: "admin_add",
      amount,
      balance_after: balanceAfter,
      detail: `Horse Racing stake refund (admin) ${amount}`,
      adminUser,
    });
    return base44.entities.HorseBet.update(bet.id, {
      status: "refunded",
      balance_after: balanceAfter,
      refunded_at: stamp,
      note,
      resolved_by: adminUser?.full_name || "admin",
    });
  }

  if (action === "mark_paid") {
    return base44.entities.HorseBet.update(bet.id, {
      status: "paid",
      paid_at: stamp,
      note,
      resolved_by: adminUser?.full_name || "admin",
    });
  }

  if (action === "mark_confirmed") {
    return base44.entities.HorseBet.update(bet.id, {
      status: "confirmed",
      confirmed_at: stamp,
      note,
      resolved_by: adminUser?.full_name || "admin",
    });
  }

  if (action === "mark_refunded") {
    return base44.entities.HorseBet.update(bet.id, {
      status: "refunded",
      refunded_at: stamp,
      note,
      resolved_by: adminUser?.full_name || "admin",
    });
  }

  return base44.entities.HorseBet.update(bet.id, {
    status: "lost",
    note,
    resolved_by: adminUser?.full_name || "admin",
  });
}