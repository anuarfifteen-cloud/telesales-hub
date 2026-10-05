// ── Premium Scratch Card rules ────────────────────────────────────────────────
// Every ticket costs ENTRY_COST tokens: 5% of tickets are a house win (no match at
// all) and the other 95% pay one of the prizes below, whose weights add up to 95
// and are each that prize's chance of ALL tickets — 30% fifty chips, 22% a hundred
// chips, 14.3% five tokens, 15.3% two hundred chips, 9.6% ten tokens, 2% Royal
// Batik, 1% Lilac Bloom and 0.8% a diamond. Chip prizes are the classic amounts ×10
// to match the casino's 10 chips = 1 token rate. A theme the player already owns
// pays 1 diamond instead.

export const ENTRY_COST = 5;

// Gold token coin used for every token visual on the Scratch Card — the ticket
// symbols, the balance header, the win celebration, the result card and the feed.
export const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";

// Black-and-gold casino chip used for every chip visual on the Scratch Card —
// the chip symbols on the ticket, the win celebration, the result card and the
// live activity feed. Cropped to a circle so its square backdrop disappears.
export const CHIP_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/5d8530cab_Screenshot2026-10-05004629.png";

// Symbols printed on the ticket. The winning prize's symbol is the one that
// appears three times, so the grid always tells the truth about the payout.
export const SYMBOLS = [
  { id: "chips5", emoji: "🍀", src: CHIP_IMG, round: true, label: "50 CHIPS", ring: "#22c55e" },
  { id: "chips10", emoji: "🔔", src: CHIP_IMG, round: true, label: "100 CHIPS", ring: "#06b6d4" },
  { id: "tokens5", emoji: "🪙", src: TOKEN_IMG, label: "5 TOKENS", ring: "#f59e0b" },
  { id: "chips20", emoji: "⭐", src: CHIP_IMG, round: true, label: "200 CHIPS", ring: "#8b5cf6" },
  { id: "tokens10", emoji: "💰", src: TOKEN_IMG, label: "10 TOKENS", ring: "#eab308" },
  { id: "royal", emoji: "👑", label: "ROYAL BATIK", ring: "#d4af37" },
  { id: "lilac", emoji: "🌸", label: "LILAC BLOOM", ring: "#ec4899" },
  { id: "diamond", emoji: "💎", label: "1 DIAMOND", ring: "#38bdf8" },
];

// Prize table (weights sum to 95, so each weight is that prize's exact chance of
// showing up on any given ticket — the missing 5% is the house win).
export const SUCCESS_TABLE = [
  { weight: 30, type: "chips", amount: 50, symbol: "chips5" },
  { weight: 22, type: "chips", amount: 100, symbol: "chips10" },
  { weight: 14.3, type: "tokens", amount: 5, symbol: "tokens5" },
  { weight: 15.3, type: "chips", amount: 200, symbol: "chips20" },
  { weight: 9.6, type: "tokens", amount: 10, symbol: "tokens10" },
  { weight: 2, type: "theme", themeId: "royal_batik", themeName: "Royal Batik", symbol: "royal" },
  { weight: 1, type: "theme", themeId: "lilac_bloom", themeName: "Lilac Bloom", symbol: "lilac" },
  { weight: 0.8, type: "diamond", amount: 1, symbol: "diamond" },
];

/** Rolls one ticket: the 5% house win first, then a weighted prize. */
export function rollScratchOutcome() {
  if (Math.random() < 0.05) return { win: false, prize: null };

  const roll = Math.random() * 95;
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
        subtitle: "Added to your token balance.",
      };
    case "diamond":
      return {
        headline: "+1 VIP Diamond",
        subtitle: granted.duplicateTheme
          ? `You already own ${granted.themeName}, so this win paid out as 1 diamond.`
          : "Jackpot! A diamond has been added to your balance.",
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

/** How loud a granted prize's celebration should be. */
export function prizeTier(granted) {
  if (!granted) return "none";
  if (granted.type === "diamond" || granted.type === "theme") return "big";
  if (granted.type === "chips" && granted.amount >= 100) return "medium";
  if (granted.type === "tokens" && granted.amount >= 10) return "medium";
  return "small";
}