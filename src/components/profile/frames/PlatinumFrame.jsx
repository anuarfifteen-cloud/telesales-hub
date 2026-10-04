// ── Platinum — "The Legend" ──────────────────────────────────────────
// Massive imposing white-gold wreath: a silver feather laurel wrapping the
// avatar with large sapphires at the top and bottom, under a blue glow.
const GEM_FACETS = [0, 60, 120, 180, 240, 300].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
});

// Two staggered rows of feathers sweeping from the lower left, over the top,
// to the lower right — 240° of wreath.
const LEAVES = [];
for (let deg = 150; deg <= 390; deg += 12) {
  LEAVES.push({ deg, r: 41.5, rx: 5.6, ry: 2.7 });
  LEAVES.push({ deg: deg + 6, r: 45, rx: 4.2, ry: 2 });
}

function leafPosition({ deg, r }) {
  const a = (deg * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

function Gem({ cx, cy, r }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="url(#platGem)" stroke="#1e293b" strokeWidth="0.8" />
      {GEM_FACETS.map(([fx, fy], i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + r * fx * 0.92}
          y2={cy + r * fy * 0.92}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="0.5"
        />
      ))}
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.35} rx={r * 0.3} ry={r * 0.2} fill="#ffffff" opacity="0.5" transform={`rotate(-32 ${cx} ${cy})`} />
    </g>
  );
}

export default function PlatinumFrame() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.9)) drop-shadow(0 0 16px rgba(37,99,235,0.65))" }}
    >
      <defs>
        <linearGradient id="platRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#e2e8f0" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="platFeather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id="platGem" cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="80%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>

      {/* white-gold band */}
      <circle cx="50" cy="50" r="36" fill="none" stroke="url(#platRing)" strokeWidth="10" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.8" />

      {/* feather wreath */}
      {LEAVES.map((leaf, i) => {
        const { x, y } = leafPosition(leaf);
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={leaf.rx}
            ry={leaf.ry}
            transform={`rotate(${leaf.deg + 90} ${x} ${y})`}
            fill="url(#platFeather)"
            stroke="#94a3b8"
            strokeWidth="0.35"
            opacity="0.95"
          />
        );
      })}

      {/* sapphires at the top and bottom */}
      <Gem cx={50} cy={13.5} r={9.5} />
      <Gem cx={50} cy={86.5} r={8} />
    </svg>
  );
}