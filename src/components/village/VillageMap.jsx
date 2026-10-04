import PixelSprite from "./PixelSprite";
import { SPRITES, COLS, ROWS, PATH_ROW, SCENERY, cellKey } from "./villageConfig";

// The village map: a pixel grid with a dirt road, scattered trees and the
// player's buildings. Static by design — no villagers, no pathfinding.
// Tapping with a building selected places it; tapping a standing building
// with nothing selected demolishes it (handled by the parent).
export default function VillageMap({ buildings, selected, onPlace, onRemove }) {
  const at = (x, y) => buildings.find((b) => b.x === x && b.y === y);

  const handleCell = (x, y) => {
    const existing = at(x, y);
    if (existing) {
      if (!selected) onRemove(existing);
      return;
    }
    if (y === PATH_ROW || SCENERY.has(cellKey(x, y))) return;
    if (selected) onPlace(x, y);
  };

  const cells = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) cells.push([x, y]);
  }

  return (
    <div
      className="overflow-hidden rounded-[18px]"
      style={{ border: "3px solid #4b3a2f", background: "#70a34b" }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
      >
        {cells.map(([x, y]) => {
          const isPath = y === PATH_ROW;
          const isScenery = SCENERY.has(cellKey(x, y));
          const building = at(x, y);
          const placeable = Boolean(selected) && !building && !isPath && !isScenery;

          return (
            <button
              key={cellKey(x, y)}
              onClick={() => handleCell(x, y)}
              className="relative flex items-end justify-center"
              style={{
                background: isPath
                  ? "#a87858"
                  : (x + y) % 2 === 0
                  ? "#70a34b"
                  : "#7aad55",
              }}
            >
              {isScenery && !building && (
                <span className="absolute inset-[10%] block">
                  <PixelSprite sprite={SPRITES.tree} />
                </span>
              )}
              {building && (
                <span className="absolute inset-[6%] block drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                  <PixelSprite sprite={SPRITES[building.type]} />
                </span>
              )}
              {placeable && (
                <span className="absolute inset-[16%] rounded-md border-2 border-white/70 bg-white/20" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}