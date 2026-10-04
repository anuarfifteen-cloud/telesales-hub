// ─────────────────────────────────────────────────────────────────────────────
// Village Builder — static configuration.
// Pixel sprites, the building catalogue, the quest chain and the clock maths.
// No React and no network calls live here.
// ─────────────────────────────────────────────────────────────────────────────

// ── Map geometry ────────────────────────────────────────────────────────────
export const COLS = 9;
export const ROWS = 7;
// The dirt road runs along this row — scenery, never buildable.
export const PATH_ROW = 3;
// Trees dotted around the edges (also not buildable).
export const SCENERY = new Set([
  "0,0", "1,0", "7,0", "8,0",
  "0,6", "8,6", "0,5", "8,5",
]);

// ── Clock ───────────────────────────────────────────────────────────────────
export const DAY_MS = 90 * 1000; // one in-game day per 90 real seconds
export const SEASON_DAYS = 30;
export const OFFLINE_CAP_MS = 3 * 60 * 60 * 1000; // max 3h of offline production
export const TICK_CAP_MS = 10 * 60 * 1000; // max 10min credited for one tick
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

export function seasonOf(day) {
  return SEASONS[Math.floor((day - 1) / SEASON_DAYS) % SEASONS.length];
}

export function yearOf(day) {
  return 1 + Math.floor((day - 1) / (SEASON_DAYS * SEASONS.length));
}

// ── Pixel sprites ───────────────────────────────────────────────────────────
// Each row is a string of palette keys; "." is transparent.
export const SPRITES = {
  farm: {
    palette: { R: "#7a4a2b", W: "#e8d9b5", g: "#6f9c3a", y: "#d8c34a" },
    pixels: [
      "............",
      "..RRRRRRRR..",
      ".RRRRRRRRRR.",
      ".RRRRRRRRRR.",
      ".WWWWWWWWWW.",
      ".WWWWWWWWWW.",
      ".gggggggggg.",
      ".gygygygygy.",
      ".gygygygygy.",
      ".gggggggggg.",
      "............",
      "............",
    ],
  },
  lumber: {
    palette: { L: "#a97142", B: "#c9a06a", D: "#6b4423" },
    pixels: [
      "............",
      "..LLLLLLLL..",
      "..LLLLLLLL..",
      "...LLLLLL...",
      "..BBBBBBBB..",
      ".BBBBBBBBBB.",
      ".BBBBBBBBBB.",
      ".BBBBBBBBBB.",
      ".BBBBBBBBBB.",
      "............",
      "...LLLLLL...",
      "............",
    ],
  },
  house: {
    palette: { R: "#a1442b", W: "#e8d9b5", D: "#6b4423" },
    pixels: [
      "............",
      "...RRRRRR...",
      "..RRRRRRRR..",
      ".RRRRRRRRRR.",
      "RRRRRRRRRRRR",
      ".WWWWWWWWWW.",
      ".WWWDDDDWWW.",
      ".WWWDDDDWWW.",
      ".WDWDDDDWDW.",
      ".WWWWWWWWWW.",
      ".WWWWWWWWWW.",
      "............",
    ],
  },
  mine: {
    palette: { S: "#7f8585", K: "#2f2f33", y: "#d8c34a", W: "#5d6262" },
    pixels: [
      "............",
      "....SSSS....",
      "...SSSSSS...",
      "..SSSSSSSS..",
      ".SSKKSSSSSW.",
      ".SSKKSSKKSS.",
      "SSSKKSSKKSSy",
      "SSSSSSSSSSSS",
      ".SSSSSSSSSS.",
      "..SSSSSSSS..",
      "...SSSSSS...",
      "............",
    ],
  },
  tavern: {
    palette: { M: "#6d3b2a", W: "#e3d0a6", D: "#3b2a1a" },
    pixels: [
      "............",
      "..MMMMMMMM..",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      ".WWWWWWWWWW.",
      ".WWWWWWWWWW.",
      ".WDWWWWWWDW.",
      ".WDWWWWWWDW.",
      ".WDWWWWWWDW.",
      ".WWWWWWWWWW.",
      "............",
      "............",
    ],
  },
  tree: {
    palette: { g: "#4f7a42", G: "#3d5e33", B: "#6b4423" },
    pixels: [
      "...ggg...",
      "..gGGGg..",
      ".gGGGGGg.",
      "gGGGGGGGg",
      "gGGGGGGGg",
      ".gGGGGGg.",
      "..gGGGg..",
      "....B....",
      "....B....",
      "...BBB...",
    ],
  },
};

// ── Buildings ───────────────────────────────────────────────────────────────
// produce = resources gained per second; population = villagers housed.
export const BUILDINGS = {
  farm: {
    name: "Farm",
    cost: { wood: 25 },
    produce: { food: 0.2 },
    population: 0,
    tip: "Grows food non-stop.",
  },
  lumber: {
    name: "Lumber Camp",
    cost: { gold: 30 },
    produce: { wood: 0.25 },
    population: 0,
    tip: "Fells timber non-stop.",
  },
  house: {
    name: "House",
    cost: { wood: 40 },
    produce: {},
    population: 2,
    tip: "Houses 2 villagers.",
  },
  mine: {
    name: "Gold Mine",
    cost: { wood: 60, food: 40 },
    produce: { gold: 0.15 },
    population: 0,
    tip: "Digs gold non-stop.",
  },
  tavern: {
    name: "Tavern",
    cost: { gold: 120, wood: 80 },
    produce: { gold: 0.35 },
    population: 3,
    tip: "Gold + 3 villagers.",
  },
};

export const BUILD_ORDER = ["farm", "lumber", "house", "mine", "tavern"];

export const RESOURCE_META = {
  gold: { label: "Gold", icon: "🪙" },
  wood: { label: "Wood", icon: "🪵" },
  food: { label: "Food", icon: "🍞" },
};

export const START_RESOURCES = { gold: 60, wood: 60, food: 60 };

// ── Quest chain ─────────────────────────────────────────────────────────────
// progress(state) → current count; the quest completes at `target`.
export const QUEST_CHAIN = [
  { id: "farm1", label: "Raise a Farm", target: 1, reward: 1, progress: (s) => countOf(s, "farm") },
  { id: "lumber1", label: "Open a Lumber Camp", target: 1, reward: 1, progress: (s) => countOf(s, "lumber") },
  { id: "house1", label: "Build a House", target: 1, reward: 1, progress: (s) => countOf(s, "house") },
  { id: "mine1", label: "Sink a Gold Mine", target: 1, reward: 1, progress: (s) => countOf(s, "mine") },
  { id: "tavern1", label: "Raise a Tavern", target: 1, reward: 2, progress: (s) => countOf(s, "tavern") },
  { id: "six", label: "Grow the village to 6 buildings", target: 6, reward: 1, progress: (s) => s.buildings.length },
  { id: "ten", label: "Grow the village to 10 buildings", target: 10, reward: 2, progress: (s) => s.buildings.length },
  { id: "gold500", label: "Bank 500 gold", target: 500, reward: 2, progress: (s) => Math.floor(s.gold) },
];

export function countOf(state, type) {
  return state.buildings.filter((b) => b.type === type).length;
}

export function cellKey(x, y) {
  return `${x},${y}`;
}