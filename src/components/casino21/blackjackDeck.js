// Pure JavaScript deck & scoring helpers for Casino 21 (Blackjack).
// No external dependencies, no server calls.

export const SUITS = [
  { sym: "♠", color: "dark" },
  { sym: "♥", color: "red" },
  { sym: "♦", color: "red" },
  { sym: "♣", color: "dark" },
];

export const RANKS = [
  { label: "A", value: 11 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 10 },
  { label: "Q", value: 10 },
  { label: "K", value: 10 },
];

// Build a fresh 52-card deck.
export function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s.sym, color: s.color, rank: r.label, value: r.value });
    }
  }
  return deck;
}

// Fisher–Yates shuffle (in-place), returns the deck.
export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Compute the best hand value, treating aces as 11 unless they bust.
export function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// True only for a 2-card 21 (an Ace + a 10-value card).
export function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

export function isBust(hand) {
  return handValue(hand) > 21;
}

// "Soft" = the hand contains an ace counted as 11 (value can drop without busting).
export function isSoft(hand) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === "A") aces++;
  }
  let acesAsEleven = aces;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven--;
  }
  return acesAsEleven > 0;
}