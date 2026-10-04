// ── Premium Scratch Card rules ────────────────────────────────────────────────
// Every ticket costs ENTRY_COST tokens. 80% of tickets win a prize and 20% are a
// house win (no match at all). The weights below are the prize's share of ALL
// tickets, so they add up to 100: 25% five chips, 18.75% ten chips, 18.75% five
// tokens, 20% twenty chips, 11.25% ten tokens, 3.25% Royal Batik, 2% Lilac Bloom
// and 1% a diamond. A theme the player already owns pays tokens instead.

export const ENTRY_COST = 5;

// Symbols printed on the ticket. The winning prize's symbol is the one that
// appears three times, so the grid always tells the truth about the payout.
export const SYMBOLS = [
  { id: "chips5", emoji: "🍀", label: "5 CHIPS", ring: "#22c55e" },
  { id: "chips10", emoji: "🔔", label: "10 CHIPS", ring: "#06b6d4" },
  { id: "tokens5", emoji: "🪙", label: "5 TOKENS", ring: "#f59e0b" },
  { id: "chips20", emoji: "⭐", label: "20 CHIPS", ring: "#8b5cf6" },
  { id: "tokens10", emoji: "💰", label: "10 TOKENS", ring: "#eab308" },
  { id: "royal", emoji: "👑", label: "ROYAL BATIK", ring: "#d4af37" },
  { id: "lilac", emoji: "🌸", label: "LILAC BLOOM", ring: "#ec4899" },
  { id: "diamond", emoji: "💎", label: "1 DIAMOND", ring: "#38bdf8" },
];

// Prize table (weights sum to 100 — each one is that prize's chance of showing up
// on any given ticket).
export const SUCCESS_TABLE = [
  { weight: 25, type: "chips", amount: 5, symbol: "chips5" },
  { weight: 18.75, type: "chips", amount: 10, symbol: "chips10" },
  { weight: 18.75, type: "tokens", amount: 5, symbol: "tokens5" },
  { weight: 20, type: "chips", amount: 20, symbol: "chips20" },
  { weight: 11.25, type: "tokens", amount: 10, symbol: "tokens10" },
  { weight: 3.25, type: "theme", themeId: "royal_batik", themeName: "Royal Batik", fallbackTokens: 10, symbol: "royal" },
  { weight: 2, type: "theme", themeId: "lilac_bloom", themeName: "Lilac Bloom", fallbackTokens: 10, symbol: "lilac" },
  { weight: 1, type: "diamond", amount: 1, symbol: "diamond" },
];

/** Rolls one ticket: the 20% house win first, then a weighted prize. */
export function rollScratchOutcome() {
  if (Math.random() < 0.2) return { win: false, prize: null };

  const roll = Math.random() * 100;
  let acc = 0;
  for (const prize of SUCCESS_TABLE) {
    acc += prize.weight;
    if (roll < acc) return { win: true, prize: { ...prize } };
  }
  return { win: true, prize: { ...SUCCESS_TABLE[0] } };
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Nine cells for one ticket. A win places the prize's symbol in exactly three
 * cells and fills the other six with three decoys used twice each, so no decoy
 * can form a second triple. A loss uses five symbols (four twice, one once) so
 * no symbol ever reaches three.
 */
export function buildGrid(winningSymbolId) {
  if (winningSymbolId) {
    const cells = new Array(9).fill(null);
    shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8])
      .slice(0, 3)
      .forEach((i) => {
        cells[i] = winningSymbolId;
      });

    const decoys = shuffle(SYMBOLS.filter((s) => s.id !== winningSymbolId).map((s) => s.id));
    const filler = shuffle([decoys[0], decoys[0], decoys[1], decoys[1], decoys[2], decoys[2]]);
    cells.forEach((value, i) => {
      if (value === null) cells[i] = filler.shift();
    });
    return cells;
  }

  const picks = shuffle(SYMBOLS.map((s) => s.id)).slice(0, 5);
  return shuffle([
    picks[0], picks[0],
    picks[1], picks[1],
    picks[2], picks[2],
    picks[3], picks[3],
    picks[4],
  ]);
}

/** Turns a granted reward into the labels the result modal shows. */
export function describeGrant(granted) {
  if (!granted) return { headline: "", subtitle: "" };
  switch (granted.type) {
    case "chips":
      return {
        headline: `+${granted.amount} Chips`,
        subtitle: "Added to your Blackjack 21 chip balance.",
      };
    case "tokens":
      return {
        headline: `+${granted.amount} Tokens`,
        subtitle: granted.duplicateTheme
          ? `You already own ${granted.themeName} — converted to ${granted.amount} tokens.`
          : "Added to your token balance.",
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