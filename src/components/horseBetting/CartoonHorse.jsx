import { memo, useId } from "react";

/**
 * Hand-drawn 2D cartoon racehorse with its numbered jockey, facing right.
 *
 * The silhouette is made of soft inked shapes with a highlight → shadow wash on
 * top, so any coat colour reads as a shaded illustration rather than a flat
 * fill. `frame` (0-3) swaps the four leg sets to animate a natural gallop.
 */

const INK = "#38241a";
const HOOF = "#2a1a12";

const BODY =
  "M43 53 C43 41 55 33 71 33 C87 33 98 39 100 49 C102 60 96 69 84 71 C70 73 54 71 47 65 C43 61 43 57 43 53 Z";
const NECK = "M92 47 C90 36 96 27 109 22 L121 33 C111 40 105 47 102 57 Z";
const HEAD =
  "M109 21 C116 12 127 12 133 19 C139 25 139 33 134 37 C129 41 121 39 116 34 C112 30 109 26 109 21 Z";
const MANE =
  "M90 47 C90 32 98 22 112 16 C118 13 122 12 127 13 C120 17 114 21 110 27 C106 33 103 41 101 49 Z";
const TAIL =
  "M46 43 C34 34 22 37 13 48 C20 45 27 45 32 47 C22 53 15 63 12 76 C22 64 30 58 44 57 Z";

// Four leg sets: two full-stretch, two gathered — cycled as 0-1-2-1.
const GAIT = [
  {
    farHind: { d: "M60 66 C58 74 62 81 68 85", hoof: [70, 87] },
    nearHind: { d: "M52 65 C46 72 38 77 30 80", hoof: [27, 81] },
    farFront: { d: "M86 63 C93 57 100 53 108 52", hoof: [110, 52] },
    nearFront: { d: "M92 63 C99 69 105 74 112 77", hoof: [114, 79] },
  },
  {
    farHind: { d: "M60 66 C54 70 46 73 38 76", hoof: [35, 77] },
    nearHind: { d: "M52 65 C52 72 56 79 61 84", hoof: [62, 86] },
    farFront: { d: "M86 63 C89 71 90 79 86 85", hoof: [85, 87] },
    nearFront: { d: "M92 63 C94 55 101 50 109 50", hoof: [111, 50] },
  },
  {
    farHind: { d: "M60 66 C56 74 58 82 64 87", hoof: [65, 89] },
    nearHind: { d: "M52 65 C50 73 44 79 37 83", hoof: [35, 84] },
    farFront: { d: "M86 63 C92 56 100 51 108 51", hoof: [110, 51] },
    nearFront: { d: "M92 63 C95 71 94 79 90 86", hoof: [89, 88] },
  },
];

function numberTone(hex) {
  const c = String(hex || "").replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#231a12" : "#ffffff";
}

function Leg({ leg, coat }) {
  return (
    <g>
      <path d={leg.d} fill="none" stroke={INK} strokeWidth="9.5" strokeLinecap="round" />
      <path d={leg.d} fill="none" stroke={coat} strokeWidth="6.4" strokeLinecap="round" />
      <ellipse cx={leg.hoof[0]} cy={leg.hoof[1]} rx="4.4" ry="3.3" fill={HOOF} />
    </g>
  );
}

function CartoonHorse({
  number = 1,
  coat = "#e67e22",
  silks = "#7c2d12",
  frame = 0,
  className = "",
  glow = false,
  blurred = false,
}) {
  const uid = useId().replace(/[:]/g, "");
  const pose = GAIT[((frame % 4) + 4) % 4] || GAIT[0];
  const wash = `wash-${uid}`;
  const tailWash = `tail-${uid}`;
  const filter = [
    "drop-shadow(0 3px 2px rgba(50,30,10,0.28))",
    blurred ? "blur(0.3px)" : "",
    glow ? "drop-shadow(0 0 7px rgba(246,196,69,0.95))" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox="0 0 150 100"
      className={className}
      style={{ filter }}
      role="img"
      aria-label={`Horse ${number}`}
    >
      <defs>
        <linearGradient id={wash} x1="0.1" y1="0" x2="0.45" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
        </linearGradient>
        <linearGradient id={tailWash} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="74" cy="91" rx="33" ry="4.2" fill="#000000" opacity="0.16" />

      {/* tail + far legs sit behind the body */}
      <path d={TAIL} fill={INK} />
      <path d={TAIL} fill={`url(#${tailWash})`} />
      <Leg leg={pose.farHind} coat={coat} />
      <Leg leg={pose.farFront} coat={coat} />

      {/* body */}
      <path d={BODY} fill={coat} />
      <path d={BODY} fill={`url(#${wash})`} />
      <path d={BODY} fill="none" stroke={INK} strokeWidth="2" />

      {/* saddle cloth with the lane number */}
      <rect x="56" y="31" width="18" height="14" rx="3.5" fill={silks} stroke={INK} strokeWidth="1.4" />
      <text
        x="65"
        y="41.6"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill={numberTone(silks)}
      >
        {number}
      </text>

      {/* neck, mane and head */}
      <path d={NECK} fill={coat} />
      <path d={NECK} fill={`url(#${wash})`} />
      <path d={NECK} fill="none" stroke={INK} strokeWidth="2" />
      <path d={HEAD} fill={coat} />
      <path d={HEAD} fill={`url(#${wash})`} />
      <path d={HEAD} fill="none" stroke={INK} strokeWidth="2" />
      <path d="M112 16 L109 6 L118 12 Z" fill={coat} stroke={INK} strokeWidth="1.6" />
      <path d="M121 13 L123 4 L128 12 Z" fill={coat} stroke={INK} strokeWidth="1.6" />
      <path d={MANE} fill={INK} />
      <circle cx="128" cy="26" r="2.1" fill={INK} />
      <circle cx="128.6" cy="25.4" r="0.7" fill="#ffffff" />
      <ellipse cx="135" cy="33" rx="1.5" ry="1.1" fill={INK} opacity="0.75" />
      <path d="M131 37 q 3 1.4 5 -0.4" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />

      {/* near legs in front */}
      <Leg leg={pose.nearHind} coat={coat} />
      <Leg leg={pose.nearFront} coat={coat} />

      {/* jockey */}
      <path d="M79 42 C76 32 82 22 94 17 C102 14 109 17 111 24 C112 31 106 37 98 40 C90 43 82 45 79 42 Z" fill={silks} />
      <path d="M79 42 C76 32 82 22 94 17 C102 14 109 17 111 24 C112 31 106 37 98 40 C90 43 82 45 79 42 Z" fill={`url(#${wash})`} />
      <path d="M104 21 C110 25 114 29 118 33" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M104 21 C110 25 114 29 118 33" fill="none" stroke={silks} strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="119" cy="34" r="2.7" fill={INK} />
      <path d="M119 34 C124 31 128 29 131 28" fill="none" stroke="#6b4a2f" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M83 40 C83 47 87 53 92 57" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M83 40 C83 47 87 53 92 57" fill="none" stroke={silks} strokeWidth="3.6" strokeLinecap="round" />
      <ellipse cx="93" cy="58" rx="4.2" ry="2.7" fill={INK} />
      <circle cx="107" cy="13" r="7.4" fill={silks} stroke={INK} strokeWidth="1.6" />
      <path d="M100 15 Q 107 21 115 15 L 114 19.5 Q 106 24 99 18.5 Z" fill={INK} opacity="0.8" />
      <path d="M100.5 10.5 L 113 8.6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/* Re-renders only when the pose changes, not on every animation frame. */
export default memo(CartoonHorse);