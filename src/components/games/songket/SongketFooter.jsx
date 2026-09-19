// Songket reference footer: two spaced all-caps phrases separated by a silver
// diamond motif. Rendered only when the active theme is songket. Purely presentational.
export default function SongketFooter() {
  return (
    <div className="w-full flex items-center justify-center gap-3 py-3">
      <span className="songket-label">Small Patterns</span>
      <span className="songket-diamond" aria-hidden="true" />
      <span className="songket-label">Brighter Tomorrows</span>
    </div>
  );
}