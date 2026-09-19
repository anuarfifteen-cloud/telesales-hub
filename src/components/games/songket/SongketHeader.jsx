import { BOARD_W } from "@/components/games/diamond-smash/constants";

// Songket reference header: spaced all-caps sub-labels flanking a Cinzel
// "Songket" title with silver diamond motifs. Rendered only when the active
// theme is songket (see DiamondSmashGame). Purely presentational.
export default function SongketHeader() {
  return (
    <div className="w-full flex flex-col items-center gap-1.5 py-2" style={{ maxWidth: BOARD_W }}>
      <div className="w-full flex items-center justify-between">
        <span className="songket-label">Brunei Malay Heritage</span>
        <span className="songket-label">Heritage In Every Move</span>
      </div>
      <div className="flex items-center justify-center gap-3">
        <span className="songket-diamond" aria-hidden="true" />
        <h1 className="songket-title text-xl text-foreground m-0 leading-none">Songket</h1>
        <span className="songket-diamond" aria-hidden="true" />
      </div>
    </div>
  );
}