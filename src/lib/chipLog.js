import { base44 } from "@/api/base44Client";

/**
 * Records a single CasinoChipLog row for a chip movement.
 *
 * Callers MUST have already persisted the new casinoChips balance before
 * calling this, and pass the resulting balance as `balance_after` so the
 * snapshot is accurate. Logging is a fire-and-forget side effect — it never
 * rejects up to gameplay (a failed log write must not break a round).
 *
 * @param {Object} opts
 * @param {Object} opts.user          The user whose chips changed (must have id; email/full_name optional).
 * @param {string} opts.action_type   One of the CasinoChipLog action_type enum values.
 * @param {number} opts.amount        Signed net chip change (+/-) for this entry.
 * @param {number} opts.balance_after Snapshot of casinoChips after the move.
 * @param {number} [opts.tokens_spent] Tokens paid for chips (cashier_buy only).
 * @param {string} opts.detail        Human-readable description.
 * @param {Object} [opts.adminUser]   The admin user, for admin_* actions (sets admin_id).
 */
export async function logChipMovement({ user, action_type, amount, balance_after, tokens_spent, detail, adminUser = null }) {
  try {
    await base44.entities.CasinoChipLog.create({
      user_id: user?.id,
      user_name: user?.full_name || user?.email?.split("@")[0] || "Player",
      user_email: user?.email || "",
      action_type,
      amount: Number(amount) || 0,
      balance_after: Number(balance_after) || 0,
      ...(tokens_spent != null ? { tokens_spent: Number(tokens_spent) || 0 } : {}),
      detail: detail || "",
      admin_id: adminUser?.id || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    // Logging must never break gameplay.
    console.warn("CasinoChipLog write failed:", e);
  }
}