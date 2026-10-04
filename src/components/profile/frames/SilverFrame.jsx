// ── Silver — "The Veteran" ───────────────────────────────────────────
// Clean polished steel: high-contrast metallic grey gradient ring with a
// geometric chevron overlapping the bottom centre of the ring.
export default function SilverFrame() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <linearGradient id="steelRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="28%" stopColor="#94a3b8" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="78%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="47.4" fill="none" stroke="#f8fafc" strokeWidth="1.3" opacity="0.85" />
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="url(#steelRing)" strokeWidth="10.5" />
      <circle cx="50" cy="50" r="35.8" fill="none" stroke="#475569" strokeWidth="1.4" opacity="0.8" />

      {/* geometric chevron overlapping the bottom centre of the ring */}
      <path
        d="M38 80.5 L50 88.5 L62 80.5 L62 87.5 L50 95.5 L38 87.5 Z"
        fill="url(#steelRing)"
        stroke="#334155"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M38 80.5 L50 88.5 L62 80.5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.7" />
    </svg>
  );
}