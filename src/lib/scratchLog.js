import { base44 } from "@/api/base44Client";

/**
 * Records one ScratchCardLog row when a player buys a ticket, returning its id.
 *
 * Logging is a fire-and-forget side effect — a failed write must never break a
 * ticket purchase, so the caller gets null instead of an error.
 */
export async function logScratchTicket({ user, cost, outcome, prize_type, prize_amount, prize_label }) {
  try {
    const record = await base44.entities.ScratchCardLog.create({
      user_id: user?.id,
      user_name: user?.full_name || user?.email?.split("@")[0] || "Player",
      user_email: user?.email || "",
      cost: Number(cost) || 0,
      outcome,
      prize_type: prize_type || "none",
      prize_amount: Number(prize_amount) || 0,
      prize_label: prize_label || "",
      collected: false,
      timestamp: new Date().toISOString(),
    });
    return record?.id || null;
  } catch (e) {
    console.warn("ScratchCardLog write failed:", e);
    return null;
  }
}

/**
 * Marks a bought ticket as scratched and stores what was actually granted —
 * a theme the player already owned converts into tokens, so the final prize can
 * differ from the rolled one.
 */
export async function updateScratchTicket(id, patch) {
  if (!id) return;
  try {
    await base44.entities.ScratchCardLog.update(id, patch);
  } catch (e) {
    console.warn("ScratchCardLog update failed:", e);
  }
}