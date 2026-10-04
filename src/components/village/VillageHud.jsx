import { RESOURCE_META, seasonOf, yearOf } from "./villageConfig";

// Top resource bar + Day/Season badge — mirrors the reference HUD.
export default function VillageHud({ state, population }) {
  const resources = ["gold", "wood", "food"];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1.5">
        {resources.map((key) => (
          <div
            key={key}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-2"
          >
            <span className="text-base leading-none">{RESOURCE_META[key].icon}</span>
            <span className="text-sm font-black text-foreground tabular-nums mt-1">
              {Math.floor(state[key])}
            </span>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-2">
          <span className="text-base leading-none">👥</span>
          <span className="text-sm font-black text-foreground tabular-nums mt-1">
            {population}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Day / Season
        </span>
        <span className="text-xs font-black text-foreground">
          Day {state.day} · {seasonOf(state.day)} · Year {yearOf(state.day)}
        </span>
      </div>
    </div>
  );
}