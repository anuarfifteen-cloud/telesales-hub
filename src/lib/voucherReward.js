/**
 * Blind Vouchers pay out in one of three currencies: tokens, Blackjack 21
 * chips, or a VIP Diamond. New vouchers store an explicit reward_type +
 * reward_amount. Vouchers written before those fields existed only carry
 * reward_tokens (1-5 tokens, or the 999 diamond sentinel), so every reader
 * goes through these helpers instead of guessing from the number.
 */

/** The Blind Voucher allocation, re-rolled whenever a BV- voucher is redeemed. */
export function rollBlindVoucherReward() {
  const roll = Math.random() * 100;
  if (roll < 1) return { type: "diamond", amount: 1 };   // 1% — VIP Diamond
  if (roll < 36) return { type: "tokens", amount: 1 };   // 35%
  if (roll < 61) return { type: "tokens", amount: 2 };   // 25%
  if (roll < 76) return { type: "chips", amount: 25 };   // 15%
  if (roll < 88) return { type: "tokens", amount: 3 };   // 12%
  if (roll < 94) return { type: "tokens", amount: 4 };   // 6%
  if (roll < 98) return { type: "chips", amount: 50 };   // 4%
  return { type: "tokens", amount: 5 };                  // 2%
}

export function resolveVoucherReward(voucher) {
  if (!voucher) return { type: "tokens", amount: 1 };
  const legacyDiamond = Number(voucher.reward_tokens) === 999;
  const type = voucher.reward_type || (legacyDiamond ? "diamond" : "tokens");
  if (type === "diamond") return { type: "diamond", amount: 1 };
  const amount = Number(voucher.reward_amount ?? voucher.reward_tokens) || 1;
  return { type, amount };
}

/**
 * The reward a voucher actually pays out. Blind Vouchers (BV- codes) roll the
 * allocation above at claim time — including vouchers bought under the old
 * table — while every other voucher keeps the reward stored on its record.
 */
export function rewardForRedemption(voucher) {
  const isBlind = typeof voucher?.code === "string" && voucher.code.startsWith("BV-");
  return isBlind ? rollBlindVoucherReward() : resolveVoucherReward(voucher);
}

/** Reward fields to persist on the voucher once a reward is settled. */
export function voucherRewardFields(reward) {
  return {
    reward_type: reward.type,
    reward_amount: reward.amount,
    // Legacy field: chips store 0 so they can never read back as tokens;
    // a diamond keeps the 999 sentinel older records use.
    reward_tokens: reward.type === "diamond" ? 999 : reward.type === "tokens" ? reward.amount : 0,
  };
}

// Human-readable reward, e.g. "3 tokens", "5 chips", "1 💎 Diamond".
export function voucherRewardText(voucher) {
  const { type, amount } = resolveVoucherReward(voucher);
  if (type === "diamond") return "1 💎 Diamond";
  if (type === "chips") return `${amount} chip${amount !== 1 ? "s" : ""}`;
  return `${amount} token${amount !== 1 ? "s" : ""}`;
}