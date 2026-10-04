// ── Gold — "The Elite" ───────────────────────────────────────────────
// Radiant ornate gold: a thicker yellow-gold gradient band, engraved beading
// and filigree ornaments, and a red ruby set at the bottom apex.
const ORNAMENTS = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return {
    x: 50 + 42 * Math.cos(a),
    y: 50 + 42 * Math.sin(a),
    rotate: deg - 90,
  };
});

export default function GoldFrame() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="20%" stopColor="#d4af37" />
          <stop offset="45%" stopColor="#fef1c9" />
          <stop offset="70%" stopColor="#c9992b" />
          <stop offset="100%" stopColor="#7a5a12" />
        </linearGradient>
        <radialGradient id="goldRuby" cx="34%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#ffe4e6" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="80%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill="none" stroke="#6b4e0a" strokeWidth="1.2" opacity="0.9" />
      {/* thick gold band */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#goldRing)" strokeWidth="14" />
      {/* engraving: beaded ring + inner lip */}
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="#7a5a12"
        strokeWidth="1.2"
        strokeDasharray="1 3.6"
        opacity="0.7"
      />
      <circle cx="50" cy="50" r="35.4" fill="none" stroke="#6b4e0a" strokeWidth="1.4" opacity="0.85" />

      {/* filigree ornaments on the band */}
      {ORNAMENTS.map((o) => (
        <ellipse
          key={`${o.x}-${o.y}`}
          cx={o.x}
          cy={o.y}
          rx="3.6"
          ry="1.6"
          transform={`rotate(${o.rotate} ${o.x} ${o.y})`}
          fill="#fdf3c8"
          opacity="0.45"
        />
      ))}

      {/* ruby at the bottom apex with gold prongs */}
      <path d="M43.5 84 L46.8 88.4" stroke="#f7d774" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M56.5 84 L53.2 88.4" stroke="#f7d774" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="50" cy="91.5" r="6.8" fill="url(#goldRuby)" stroke="#7f1d1d" strokeWidth="0.9" />
      <ellipse cx="47.6" cy="88.8" rx="2.1" ry="1.3" fill="#ffffff" opacity="0.55" transform="rotate(-32 47.6 88.8)" />
    </svg>
  );
}