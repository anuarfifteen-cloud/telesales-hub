import PixelSprite from "./PixelSprite";
import { BUILDINGS, BUILD_ORDER, SPRITES, RESOURCE_META } from "./villageConfig";
import { canAfford } from "./villageLogic";

// Build menu — pick a building, then tap the map to place it.
// Unaffordable (or already-selected) entries dim, with their cost shown.
export default function VillageBuildMenu({ state, selected, onSelect }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Build
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BUILD_ORDER.map((key) => {
          const def = BUILDINGS[key];
          const affordable = canAfford(state, def.cost);
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(isSelected ? null : key)}
              disabled={!affordable}
              className={`flex-shrink-0 w-24 rounded-xl border p-2 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40"
                  : "border-border bg-background"
              } ${affordable ? "hover:border-emerald-400" : "opacity-40"}`}
            >
              <div className="mx-auto h-10 w-10">
                <PixelSprite sprite={SPRITES[key]} />
              </div>
              <p className="mt-1 text-[11px] font-bold text-foreground leading-tight">
                {def.name}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold text-muted-foreground leading-tight">
                {Object.entries(def.cost)
                  .map(([res, amt]) => `${amt} ${RESOURCE_META[res].icon}`)
                  .join(" + ")}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {selected
          ? `Tap an empty tile to place the ${BUILDINGS[selected].name}.`
          : "Pick a building, then tap the map. Tap a placed building to demolish it for half the cost back."}
      </p>
    </div>
  );
}