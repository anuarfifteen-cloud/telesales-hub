import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import VillageHud from "./VillageHud";
import VillageMap from "./VillageMap";
import VillageBuildMenu from "./VillageBuildMenu";
import VillageQuestPanel from "./VillageQuestPanel";
import VillageLeaderboard from "./VillageLeaderboard";
import { BUILDINGS, DAY_MS, TICK_CAP_MS } from "./villageConfig";
import {
  loadVillage,
  persistVillage,
  awardTokens,
  upsertLeaderboard,
  productionPerSec,
  canAfford,
  payCost,
  populationOf,
  currentQuest,
  questProgress,
} from "./villageLogic";

// Village Builder — an idle village on a static map. Buildings are placed by
// tap and simply produce resources on a timer. State follows the account via
// the VillageSave entity, and completed quests pay tokens + feed the
// VillageLeaderboard.
export default function VillageBuilder({ user, onUserUpdate, isAdmin, villageEnabled }) {
  const [state, setState] = useState(null);
  const [view, setView] = useState("village");
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState(null);
  const stateRef = useRef(null);
  const recordRef = useRef(null);
  const tickRef = useRef(Date.now());

  const commit = (patch) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    return next;
  };

  const save = (s) => {
    persistVillage(recordRef.current, s, user)
      .then((rec) => {
        if (rec?.id) recordRef.current = rec;
      })
      .catch(() => {});
  };

  // Quests are checked after every tick and every build. Completing one pays
  // its tokens through the normal token path and advances the chain.
  const checkQuest = (s) => {
    const quest = currentQuest(s);
    if (!quest || questProgress(s, quest) < quest.target) return s;

    const next = commit({ questIndex: s.questIndex + 1, questsDone: s.questsDone + 1 });
    setFlash({
      title: "Quest complete!",
      body: `${quest.label} — +${quest.reward} token${quest.reward > 1 ? "s" : ""}`,
    });
    setTimeout(() => setFlash(null), 3400);

    awardTokens(user, quest.reward, `Village Quest — ${quest.label}`)
      .then(() => onUserUpdate?.())
      .catch(() => {});
    upsertLeaderboard(user, next).catch(() => {});
    save(next);
    return next;
  };

  // Load the saved village (with offline production) once per user.
  useEffect(() => {
    let alive = true;
    loadVillage(user).then(({ record, state: loaded }) => {
      if (!alive) return;
      recordRef.current = record;
      stateRef.current = loaded;
      setState(loaded);
      tickRef.current = Date.now();
      checkQuest(loaded);
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Production tick + periodic autosave.
  useEffect(() => {
    const tick = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const now = Date.now();
      const ms = Math.min(now - tickRef.current, TICK_CAP_MS);
      tickRef.current = now;
      if (ms <= 0) return;

      const per = productionPerSec(s.buildings);
      const secs = ms / 1000;
      let dayMs = s.dayMs + ms;
      let day = s.day;
      while (dayMs >= DAY_MS) {
        dayMs -= DAY_MS;
        day += 1;
      }

      const next = commit({
        gold: s.gold + per.gold * secs,
        wood: s.wood + per.wood * secs,
        food: s.food + per.food * secs,
        day,
        dayMs,
      });
      checkQuest(next);
    }, 1000);

    const autoSave = setInterval(() => {
      if (stateRef.current) save(stateRef.current);
    }, 15000);

    return () => {
      clearInterval(tick);
      clearInterval(autoSave);
    };
  }, [user?.id]);

  const handlePlace = (x, y) => {
    const s = stateRef.current;
    const def = BUILDINGS[selected];
    if (!def || !canAfford(s, def.cost)) return;
    if (s.buildings.some((b) => b.x === x && b.y === y)) return;

    const paid = payCost(s, def.cost);
    const next = commit({ ...paid, buildings: [...s.buildings, { type: selected, x, y }] });
    setSelected(null);
    upsertLeaderboard(user, next).catch(() => {});
    save(next);
    checkQuest(next);
  };

  const handleRemove = (building) => {
    const s = stateRef.current;
    const def = BUILDINGS[building.type];
    const next = { ...s };
    Object.entries(def.cost).forEach(([res, amount]) => {
      next[res] = s[res] + Math.floor(amount / 2);
    });
    next.buildings = s.buildings.filter(
      (b) => !(b.x === building.x && b.y === building.y)
    );
    commit(next);
    upsertLeaderboard(user, next).catch(() => {});
    save(next);
  };

  if (!state) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Village / Ranks strip */}
      <div className="flex gap-1 rounded-t-2xl border border-border bg-muted/50 p-1">
        {[
          ["village", "🏘️ Village"],
          ["ranks", "🏆 Ranks"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              view === id
                ? "border border-border bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "village" ? (
        <>
          <VillageHud state={state} population={populationOf(state.buildings)} />
          <VillageMap
            buildings={state.buildings}
            selected={selected}
            onPlace={handlePlace}
            onRemove={handleRemove}
          />
          <VillageBuildMenu state={state} selected={selected} onSelect={setSelected} />
          <VillageQuestPanel state={state} />
          {isAdmin && !villageEnabled && (
            <p className="text-center text-[10px] font-semibold text-muted-foreground">
              Admin preview — players can't see this until you switch it on in Admin Dashboard → 🏘️ Village.
            </p>
          )}
        </>
      ) : (
        <VillageLeaderboard user={user} />
      )}

      {/* Quest reward flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="pointer-events-none fixed bottom-28 left-1/2 z-40 w-[86%] max-w-sm -translate-x-1/2 rounded-2xl border border-amber-400/60 bg-amber-500/95 px-4 py-3 text-center shadow-xl"
          >
            <p className="text-sm font-black uppercase tracking-widest text-emerald-950">
              {flash.title}
            </p>
            <p className="text-xs font-bold text-emerald-900">{flash.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}