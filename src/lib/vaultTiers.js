// Vault tier thresholds for the Vault Titans leaderboard.
// Tiers are evaluated against user.tapVaultBalance.
export const VAULT_TIERS = [
  { min: 5000001, title: "Platinum", icon: "👑", accent: "text-cyan-300", badge: "bg-gradient-to-r from-cyan-200 to-slate-300" },
  { min: 10001, title: "Diamond", icon: "💎", accent: "text-sky-400", badge: "bg-gradient-to-r from-sky-200 to-blue-300" },
  { min: 501, title: "Gold", icon: "🥇", accent: "text-amber-400", badge: "bg-gradient-to-r from-amber-300 to-yellow-400" },
  { min: 100, title: "Silver", icon: "🥈", accent: "text-slate-300", badge: "bg-gradient-to-r from-slate-200 to-slate-400" },
  { min: 1, title: "Bronze", icon: "🥉", accent: "text-orange-400", badge: "bg-gradient-to-r from-orange-300 to-amber-500" },
];

// Ascending copy for "next tier" calculations.
const ASC = [...VAULT_TIERS].sort((a, b) => a.min - b.min);

// Returns the tier object for a given balance, or null if balance is 0.
export function getVaultTier(balance) {
  const v = Number(balance) || 0;
  return VAULT_TIERS.find((t) => v >= t.min) || null;
}

// Returns the next tier above the current balance, or null if already at the top.
export function getNextTier(balance) {
  const v = Number(balance) || 0;
  return ASC.find((t) => v < t.min) || null;
}

// Tokens still needed to reach the next tier (0 if already at the top).
export function tokensToNextTier(balance) {
  const next = getNextTier(balance);
  if (!next) return 0;
  return Math.max(0, next.min - (Number(balance) || 0));
}