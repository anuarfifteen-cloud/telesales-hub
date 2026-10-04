// ── Diamond — "The Master" ───────────────────────────────────────────
// Angular crystalline ice: the band is a jagged 12-sided polygon ring with
// faceted spokes, and it pulses with an inset + outset cyan glow.
const OUTER_RADII = [48, 43.2];
const INNER_RADII = [35.8, 32.6];

function ringPoints(radii) {
  return Array.from({ length: 12 }, (_, i) => {
    const a = ((-90 + i * 30) * Math.PI) / 180;
    const r = radii[i % 2];
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
}

const outer = ringPoints(OUTER_RADII);
const inner = ringPoints(INNER_RADII);

const toPath = (pts) =>
  `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ")} Z`;

const RING_PATH = `${toPath(outer)} ${toPath(inner)}`;
const OUTER_OUTLINE = toPath(outer);

export default function DiamondFrame() {
  return (
    <>
      {/* pulsing cyan aura (inset + outset shadow, keyframes in index.css) */}
      <div className="tier-diamond-glow absolute rounded-full" style={{ inset: 0 }} />

      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <defs>
          <linearGradient id="diamondIce" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0f7ff" />
            <stop offset="32%" stopColor="#67e8f9" />
            <stop offset="62%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#cffafe" />
          </linearGradient>
          <radialGradient id="diamondInner" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(34,211,238,0)" />
            <stop offset="88%" stopColor="rgba(34,211,238,0.5)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.12)" />
          </radialGradient>
        </defs>

        {/* inner crystalline bleed onto the avatar's edge */}
        <circle cx="50" cy="50" r="35" fill="url(#diamondInner)" />

        {/* faceted gem ring */}
        <path d={RING_PATH} fill="url(#diamondIce)" fillRule="evenodd" />

        {/* facet spokes */}
        {outer.map(([x, y], i) => (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={inner[i][0]}
            y2={inner[i][1]}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
          />
        ))}

        <path d={OUTER_OUTLINE} fill="none" stroke="#0891b2" strokeWidth="0.7" />
      </svg>
    </>
  );
}