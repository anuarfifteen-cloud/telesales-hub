// ── Claw Machine rules ────────────────────────────────────────────────────────
// Every drop costs ENTRY_COST tokens and rolls the outcome table below.
// 20% of the time the claw slips on the way up (House wins). Otherwise one of
// the eight prizes is drawn from the weights, which add up to 80.

export const ENTRY_COST = 5;

export const CAPSULES = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

// Successful-pull prize table (weights sum to 80).
export const SUCCESS_TABLE = [
  { weight: 20, type: "chips", amount: 5 },
  { weight: 15, type: "chips", amount: 10 },
  { weight: 15, type: "tokens", amount: 5, moneyBack: true },
  { weight: 12, type: "chips", amount: 20 },
  { weight: 9, type: "tokens", amount: 10 },
  { weight: 6, type: "theme", themeId: "royal_batik", themeName: "Royal Batik", fallbackTokens: 10 },
  { weight: 2, type: "theme", themeId: "lilac_bloom", themeName: "Lilac Bloom", fallbackTokens: 10 },
  { weight: 1, type: "diamond", amount: 1 },
];

/** Rolls one drop: the 20% slip first, then a weighted prize from the table. */
export function rollClawOutcome() {
  if (Math.random() < 0.2) return { slip: true, prize: null };

  const roll = Math.random() * 80;
  let acc = 0;
  for (const prize of SUCCESS_TABLE) {
    acc += prize.weight;
    if (roll < acc) return { slip: false, prize: { ...prize } };
  }
  return { slip: false, prize: { ...SUCCESS_TABLE[0] } };
}

/**
 * Which capsule the claw is above. Capsules are laid out edge-to-edge across the
 * track, so the claw's grab width (± half a spacing) overlaps a capsule at every
 * x — the drop always catches one, which is why the roll applies on every drop.
 */
export function nearestCapsuleIndex(x, count = CAPSULES.length) {
  const spacing = 100 / count;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i += 1) {
    const dist = Math.abs(x - (i + 0.5) * spacing);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Turns a roll result into the labels the winner modal shows. */
export function describeGrant(granted) {
  if (!granted) return { headline: "", subtitle: "" };
  switch (granted.type) {
    case "chips":
      return {
        headline: `+${granted.amount} Chips`,
        subtitle: `Added to your Blackjack 21 chip balance.`,
      };
    case "tokens":
      return {
        headline: `+${granted.amount} Tokens`,
        subtitle: granted.duplicateTheme
          ? `You already own ${granted.themeName} — converted to ${granted.amount} tokens.`
          : `Added to your token balance.`,
      };
    case "diamond":
      return {
        headline: "+1 VIP Diamond",
        subtitle: "Jackpot! A diamond has been added to your balance.",
      };
    case "theme":
      return {
        headline: `${granted.themeName} Unlocked!`,
        subtitle: "An exclusive theme is now yours — equip it in the Profile tab.",
      };
    default:
      return { headline: "Winner!", subtitle: "" };
  }
}