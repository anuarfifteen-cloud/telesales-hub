import { base44 } from "@/api/base44Client";
import {
  BUILDINGS,
  QUEST_CHAIN,
  START_RESOURCES,
  OFFLINE_CAP_MS,
  DAY_MS,
} from "./villageConfig";

const round2 = (n) => Math.round(n * 100) / 100;

export function freshState() {
  return {
    gold: START_RESOURCES.gold,
    wood: START_RESOURCES.wood,
    food: START_RESOURCES.food,
    buildings: [],
    questIndex: 0,
    questsDone: 0,
    day: 1,
    dayMs: 0,
  };
}

export function populationOf(buildings) {
  return buildings.reduce((sum, b) => sum + (BUILDINGS[b.type]?.population || 0), 0);
}

// Resources gained per second across every standing building.
export function productionPerSec(buildings) {
  const per = { gold: 0, wood: 0, food: 0 };
  buildings.forEach((b) => {
    const def = BUILDINGS[b.type];
    if (!def?.produce) return;
    Object.entries(def.produce).forEach(([key, rate]) => {
      per[key] += rate;
    });
  });
  return per;
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([key, amount]) => state[key] >= amount);
}

export function payCost(state, cost) {
  const next = { ...state };
  Object.entries(cost).forEach(([key, amount]) => {
    next[key] = state[key] - amount;
  });
  return next;
}

export function currentQuest(state) {
  return QUEST_CHAIN[state.questIndex] || null;
}

export function questProgress(state, quest) {
  if (!quest) return 0;
  return Math.min(quest.progress(state), quest.target);
}

export function ownerName(user) {
  return user?.full_name || user?.email?.split("@")[0] || "Unknown";
}

// ── Load (with offline production) ─────────────────────────────────────────
export async function loadVillage(user) {
  const rows = await base44.entities.VillageSave.filter({ user_id: user.id });
  const record = rows[0];
  if (!record) return { record: null, state: freshState() };

  const buildings = Array.isArray(record.buildings) ? record.buildings : [];
  const last = record.last_tick ? new Date(record.last_tick).getTime() : Date.now();
  const elapsed = Math.max(0, Math.min(Date.now() - last, OFFLINE_CAP_MS));
  const per = productionPerSec(buildings);
  const secs = elapsed / 1000;

  return {
    record,
    state: {
      gold: (Number(record.gold) || 0) + per.gold * secs,
      wood: (Number(record.wood) || 0) + per.wood * secs,
      food: (Number(record.food) || 0) + per.food * secs,
      buildings,
      questIndex: Number(record.quest_index) || 0,
      questsDone: Number(record.quests_done) || 0,
      day: (Number(record.day) || 1) + Math.floor(elapsed / DAY_MS),
      dayMs: elapsed % DAY_MS,
    },
  };
}

export async function persistVillage(record, state, user) {
  const payload = {
    user_id: user.id,
    user_name: ownerName(user),
    gold: round2(state.gold),
    wood: round2(state.wood),
    food: round2(state.food),
    population: populationOf(state.buildings),
    buildings: state.buildings,
    quest_index: state.questIndex,
    quests_done: state.questsDone,
    day: state.day,
    last_tick: new Date().toISOString(),
  };
  if (record?.id) return base44.entities.VillageSave.update(record.id, payload);
  return base44.entities.VillageSave.create(payload);
}

// ── Token payout (same path as the rest of the Tokens tab) ─────────────────
export async function awardTokens(user, amount, source) {
  if (!amount) return;
  await base44.auth.updateMe({
    earlyAccessTokens: (user?.earlyAccessTokens ?? 0) + amount,
  });
  await base44.entities.TokenTransaction.create({
    user_id: user.id,
    user_name: ownerName(user),
    amount,
    source,
    timestamp: new Date().toISOString(),
  });
}

// ── Leaderboard ────────────────────────────────────────────────────────────
export async function upsertLeaderboard(user, state) {
  const score = state.questsDone * 100 + state.buildings.length;
  const payload = {
    user_id: user.id,
    user_name: ownerName(user),
    score,
    quests_done: state.questsDone,
    buildings_count: state.buildings.length,
    updated_at: new Date().toISOString(),
  };
  const rows = await base44.entities.VillageLeaderboard.filter({ user_id: user.id });
  if (rows[0]) return base44.entities.VillageLeaderboard.update(rows[0].id, payload);
  return base44.entities.VillageLeaderboard.create(payload);
}