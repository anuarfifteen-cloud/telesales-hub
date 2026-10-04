// ── Bronze — "The Grunt" ─────────────────────────────────────────────
// Sturdy industrial forged copper + dark iron. Thick copper gradient ring
// with four dark iron rivets at the top, bottom, left and right edges.
const RIVETS = [
  [50, 8],
  [92, 50],
  [50, 92],
  [8, 50],
];

export default function BronzeFrame() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <linearGradient id="bronzeRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a5a2b" />
          <stop offset="22%" stopColor="#c87941" />
          <stop offset="46%" stopColor="#5c3517" />
          <stop offset="72%" stopColor="#b26b34" />
          <stop offset="100%" stopColor="#4a2a11" />
        </linearGradient>
        <radialGradient id="bronzeRivet" cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#7a7a7a" />
          <stop offset="50%" stopColor="#2e2e2e" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </radialGradient>
      </defs>

      {/* dark iron outer rim */}
      <circle cx="50" cy="50" r="48.6" fill="none" stroke="#2b1c0d" strokeWidth="1.5" opacity="0.9" />
      {/* forged copper body */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#bronzeRing)" strokeWidth="13" />
      {/* inner iron lip */}
      <circle cx="50" cy="50" r="35.4" fill="none" stroke="#241608" strokeWidth="1.6" opacity="0.85" />

      {RIVETS.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="4.5" fill="url(#bronzeRivet)" stroke="#2f1d0c" strokeWidth="0.9" />
          <circle cx={cx - 1.2} cy={cy - 1.3} r="1.1" fill="#c7c7c7" opacity="0.45" />
        </g>
      ))}
    </svg>
  );
}