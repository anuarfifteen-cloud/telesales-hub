/**
 * Blind Vouchers pay out in one of three currencies: tokens, Blackjack 21
 * chips, or a VIP Diamond. New vouchers store an explicit reward_type +
 * reward_amount. Vouchers written before those fields existed only carry
 * reward_tokens (1-5 tokens, or the 999 diamond sentinel), so every reader
 * goes through these helpers instead of guessing from the number.
 */

export function resolveVoucherReward(voucher) {
  if (!voucher) return { type: "tokens", amount: 1 };
  const legacyDiamond = Number(voucher.reward_tokens) === 999;
  const type = voucher.reward_type || (legacyDiamond ? "diamond" : "tokens");
  if (type === "diamond") return { type: "diamond", amount: 1 };
  const amount = Number(voucher.reward_amount ?? voucher.reward_tokens) || 1;
  return { type, amount };
}

// Human-readable reward, e.g. "3 tokens", "5 chips", "1 💎 Diamond".
export function voucherRewardText(voucher) {
  const { type, amount } = resolveVoucherReward(voucher);
  if (type === "diamond") return "1 💎 Diamond";
  if (type === "chips") return `${amount} chip${amount !== 1 ? "s" : ""}`;
  return `${amount} token${amount !== 1 ? "s" : ""}`;
}