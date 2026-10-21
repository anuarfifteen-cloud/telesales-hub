import { base44 } from "@/api/base44Client";

// Booking-count milestones: dark-mode unlock at 5 bookings, then token (and
// diamond) awards at 15, 30, 50, 100, 250, 500 and 1000 bookings. Each tier pays
// once — the claim is stamped on the player's own user record.
const TOKEN_TIERS = [
  { count: 15, tokens: 3, title: "🏆 Early Access Unlocked!", message: "Amazing! You've hit 15 bookings and earned 3 Early Access tokens. Spend a token to book your breaks 30 minutes early for 24 hours. Keep booking to earn more!" },
  { count: 30, tokens: 5, title: "🌟 Bonus Tokens Awarded!", message: "Incredible! You've hit 30 bookings and earned 5 extra Early Access tokens on top of your remaining balance. Keep it up!" },
  { count: 50, tokens: 10, title: "💎 Elite Milestone!", message: "Wow! You've hit 50 bookings and earned 10 Early Access tokens! You're on fire — keep going!" },
  { count: 100, tokens: 20, title: "🚀 Legend Status!", message: "INCREDIBLE! 100 bookings! You've earned a massive 20 Early Access tokens. You are a true Telesales legend!" },
  { count: 250, tokens: 25, diamonds: 1, title: "💠 250 Bookings Milestone!", message: "Phenomenal! You've hit 250 bookings and earned 1 Diamond + 25 Early Access tokens!" },
  { count: 500, tokens: 30, diamonds: 3, title: "🔷 500 Bookings Milestone!", message: "Outstanding! You've hit 500 bookings and earned 3 Diamonds + 30 Early Access tokens!" },
  { count: 1000, tokens: 50, diamonds: 5, title: "🏆 1000 Bookings Milestone!", message: "LEGENDARY! You've hit 1000 bookings and earned 5 Diamonds + 50 Early Access tokens!" },
];

/**
 * Awards whichever booking milestone `totalCount` has just reached.
 * `refreshUser` reloads the player record; `showUnlock` opens the reward popup.
 */
export async function checkBookingMilestones(totalCount, { refreshUser, showUnlock } = {}) {
  // Dark mode unlock at 5 bookings
  if (totalCount >= 5 && !localStorage.getItem("hasSeenDarkModeModal")) {
    localStorage.setItem("hasSeenDarkModeModal", "true");
    showUnlock?.(
      "🎉 Achievement Unlocked!",
      "Congratulations! You just hit 5 successful bookings and unlocked Dark Mode. You can now toggle your app theme in the Profile tab. Keep up the great work!"
    );
  }

  for (const tier of TOKEN_TIERS) {
    if (totalCount < tier.count) continue;
    const freshUser = await base44.auth.me();
    const awarded = freshUser?.milestoneTokensAwarded || {};
    if (awarded[String(tier.count)]) continue;

    const patch = {
      earlyAccessTokens: (freshUser?.earlyAccessTokens ?? 0) + tier.tokens,
      milestoneTokensAwarded: { ...awarded, [String(tier.count)]: true },
    };
    if (tier.diamonds) patch.diamonds = (freshUser?.diamonds ?? 0) + tier.diamonds;

    await base44.auth.updateMe(patch);
    await base44.entities.TokenTransaction.create({
      user_id: freshUser.id,
      user_name: freshUser.full_name || freshUser.email,
      amount: tier.tokens,
      source: `Booking Milestone — ${tier.count} Bookings`,
      timestamp: new Date().toISOString(),
    });
    await refreshUser?.();
    showUnlock?.(tier.title, tier.message);
    return;
  }
}