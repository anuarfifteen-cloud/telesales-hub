import { memo, useId } from "react";

/**
 * Hand-drawn 2D cartoon racehorse and its numbered jockey, facing right.
 *
 * Anatomy is built from inked shapes: barrel, haunch and shoulder contours,
 * tapered three-joint legs computed from per-frame angles, and a fully drawn
 * jockey (helmet, goggles, silks, arms on the reins, boots in the irons).
 * `frame` (0-3) swaps the four gallop poses.
 */

const INK = "#332119";
const HOOF = "#241812";
const SKIN = "#f0c2a0";
const BREECHES = "#f3f1ea";

const RAD = Math.PI / 180;
const pt = (p, a, l) => [p[0] + Math.sin(a * RAD) * l, p[1] + Math.cos(a * RAD) * l];

// Tapered limb segment (a → b) with different widths at each end.
function limb(a, b, w1, w2) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) / 2;
  const ny = dx / len / 2;
  return `M${a[0] + nx * w1} ${a[1] + ny * w1} L${b[0] + nx * w2} ${b[1] + ny * w2} L${b[0] - nx * w2} ${b[1] - ny * w2} L${a[0] - nx * w1} ${a[1] - ny * w1} Z`;
}

const UPPER = 23;
const LOWER = 21;
const WIDTHS = [11, 7.5, 5.5];

const HIP_NEAR = [60, 65];
const HIP_FAR = [63, 63];
const SHOULDER_NEAR = [104, 63];
const SHOULDER_FAR = [100, 61];

// [upper angle, knee bend] in degrees from vertical, positive = forward.
const GAIT = [
  {
    farHind: [-40, -14],
    nearHind: [-52, -20],
    farFront: [50, -8],
    nearFront: [64, -12],
  },
  {
    farHind: [-4, -44],
    nearHind: [8, -54],
    farFront: [24, -32],
    nearFront: [38, -44],
  },
  {
    farHind: [24, -74],
    nearHind: [34, -84],
    farFront: [16, -92],
    nearFront: [28, -104],
  },
  {
    farHind: [-20, -28],
    nearHind: [-32, -36],
    farFront: [42, -20],
    nearFront: [56, -30],
  },
];

const BODY =
  "M47 58 C47 42 60 33 79 32 C96 31 110 37 115 48 C119 57 116 68 107 74 C96 81 78 82 66 78 C55 74 48 68 47 58 Z";
const TAIL = "M52 46 C40 33 24 32 11 42 C21 41 30 44 34 49 C21 53 12 63 8 77 C20 62 32 57 47 60 Z";
const NECK =
  "M95 47 C96 36 103 26 115 20 C124 16 131 18 134 24 C128 29 121 34 116 41 C111 48 108 55 106 62 Z";
const HEAD =
  "M130 22 C140 19 149 24 152 33 C154 40 150 47 143 48 C136 49 130 44 127 37 C125 31 127 25 130 22 Z";
const MANE =
  "M94 46 C94 33 103 22 116 15 C124 11 131 12 136 17 C127 20 119 26 114 34 C110 41 107 48 106 57 C102 52 98 49 94 46 Z";
const JOCKEY_BODY =
  "M75 36 C71 26 78 16 91 13 C100 11 106 15 107 22 C108 29 101 34 92 36 C85 38 77 39 75 36 Z";

function mix(hex, amt) {
  const raw = String(hex || "").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (full.length !== 6) return hex || "#e67e22";
  const n = parseInt(full, 16) || 0;
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt < 0) {
    const k = 1 + amt;
    r *= k;
    g *= k;
    b *= k;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function numberTone(hex) {
  const c = String(hex || "").replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#231a12" : "#ffffff";
}

function Leg({ anchor, pose, fill, scale = 1, weight = 1.7 }) {
  const [upper, bend] = pose;
  const knee = pt(anchor, upper, UPPER * scale);
  const fet = pt(knee, upper + bend, LOWER * scale);
  const w = WIDTHS.map((v) => v * scale);

  return (
    <g fill={fill} stroke={INK} strokeWidth={weight} strokeLinejoin="round">
      <path d={limb(anchor, knee, w[0], w[1])} />
      <path d={limb(knee, fet, w[1], w[2])} />
      <circle cx={knee[0]} cy={knee[1]} r={w[1] * 0.52} />
      <path
        d={`M${fet[0] - 4.8} ${fet[1] - 1} L${fet[0] + 4.8} ${fet[1] - 1} L${fet[0] + 4.2} ${fet[1] + 5} L${fet[0] - 4.2} ${fet[1] + 5} Z`}
        fill={HOOF}
        strokeWidth={1.3}
      />
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
  const shade = mix(coat, -0.32);
  const line = mix(coat, -0.5);
  const silkDark = mix(silks, -0.3);
  const numTone = numberTone(silks);
  const filter = [
    "drop-shadow(0 3px 2px rgba(50,30,10,0.28))",
    blurred ? "blur(0.3px)" : "",
    glow ? "drop-shadow(0 0 7px rgba(246,196,69,0.95))" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox="0 0 180 118"
      className={className}
      style={{ filter }}
      role="img"
      aria-label={`Horse ${number}`}
    >
      <defs>
        <linearGradient id={wash} x1="0.1" y1="0" x2="0.45" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.26" />
        </linearGradient>
      </defs>

      <ellipse cx="86" cy="111" rx="38" ry="4" fill="#000000" opacity="0.16" />

      {/* tail + far side legs sit behind the barrel */}
      <path d={TAIL} fill={line} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <Leg anchor={HIP_FAR} pose={pose.farHind} fill={shade} scale={0.92} weight={1.4} />
      <Leg anchor={SHOULDER_FAR} pose={pose.farFront} fill={shade} scale={0.92} weight={1.4} />

      {/* barrel with muscular contours */}
      <path d={BODY} fill={coat} />
      <ellipse cx="86" cy="43" rx="20" ry="8" fill="#ffffff" opacity="0.13" />
      <path d="M50 61 C57 50 71 47 82 54" fill="none" stroke={line} strokeWidth="1.6" opacity="0.65" />
      <path d="M97 44 C107 50 109 61 101 69" fill="none" stroke={line} strokeWidth="1.6" opacity="0.6" />
      <path d="M83 49 C88 55 88 65 82 71" fill="none" stroke={line} strokeWidth="1.3" opacity="0.4" />
      <path d={BODY} fill={`url(#${wash})`} />
      <path d={BODY} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* near side legs, in front of the barrel */}
      <Leg anchor={HIP_NEAR} pose={pose.nearHind} fill={coat} />
      <Leg anchor={SHOULDER_NEAR} pose={pose.nearFront} fill={coat} />

      {/* saddle pad with the lane number */}
      <path d="M65 33 C65 29 96 29 96 33 C96 44 94 50 80 50 C66 50 65 44 65 33 Z" fill={silks} stroke={INK} strokeWidth="1.6" />
      <text
        x="80"
        y="46"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill={numTone}
      >
        {number}
      </text>
      <ellipse cx="80" cy="33" rx="11" ry="3.6" fill={mix("#6b4a2f", -0.1)} stroke={INK} strokeWidth="1.2" />

      {/* jockey — far arm, silks, then near arm and legs */}
      <path d="M93 23 C98 27 102 30 106 33" fill="none" stroke={INK} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M93 23 C98 27 102 30 106 33" fill="none" stroke={silkDark} strokeWidth="3.4" strokeLinecap="round" />
      <path d={JOCKEY_BODY} fill={silks} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M83 20 C89 26 96 28 102 26" fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.85" strokeLinecap="round" />
      <path d="M81 36 C87 40 92 43 95 46" fill="none" stroke={INK} strokeWidth="6.6" strokeLinecap="round" />
      <path d="M81 36 C87 40 92 43 95 46" fill="none" stroke={BREECHES} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M95 46 C97 50 95 54 91 55.5" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M95 46 C97 50 95 54 91 55.5" fill="none" stroke="#2b201a" strokeWidth="4" strokeLinecap="round" />
      <path d="M89 57 q 3.6 3.6 6.8 0.4" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />

      {/* helmet, goggles and face */}
      <circle cx="104" cy="11" r="8.4" fill={silks} stroke={INK} strokeWidth="1.6" />
      <path d="M96 9.5 C100 6 109 6 112 9.6" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
      <text x="104" y="13.6" textAnchor="middle" fontSize="7.2" fontWeight="900" fontFamily="Inter, sans-serif" fill={numTone}>
        {number}
      </text>
      <rect x="99" y="14.6" width="10.6" height="3.8" rx="1.9" fill="#22242c" />
      <path d="M100.4 16.2 L104 16.2" stroke="#ffffff" strokeWidth="0.9" opacity="0.8" />
      <ellipse cx="108.4" cy="20.4" rx="3.9" ry="4.1" fill={SKIN} stroke={INK} strokeWidth="1.2" />
      <path d="M105 23.6 C106 26 109 27 111 25" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" strokeLinecap="round" />

      {/* neck, mane and head */}
      <path d={NECK} fill={coat} />
      <path d="M100 40 C104 30 110 24 119 20" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.16" strokeLinecap="round" />
      <path d={NECK} fill={`url(#${wash})`} />
      <path d={NECK} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M94 46 C94 33 103 22 116 15 C124 11 131 12 136 17 C127 20 119 26 114 34 C110 41 107 48 106 57 C102 52 98 49 94 46 Z" fill={line} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M128 21 L126 11 L134 17 Z" fill={coat} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M134 19 L136 9 L142 16 Z" fill={coat} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={HEAD} fill={coat} />
      <path d={HEAD} fill={`url(#${wash})`} />
      <path d={HEAD} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M134 26 C137 30 138 35 136 39" fill="none" stroke={line} strokeWidth="1.4" opacity="0.6" />
      <circle cx="137" cy="29" r="2.2" fill={INK} />
      <circle cx="137.7" cy="28.3" r="0.75" fill="#ffffff" />
      <ellipse cx="148" cy="39" rx="1.7" ry="1.2" fill={INK} opacity="0.8" />
      <path d="M147 44 q 3.4 1.6 5.4 -0.4" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M132 34 L147 32" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.85" />

      {/* near arm reaching over the withers, glove and reins on top of the neck */}
      <path d="M94 24 C99 28 104 32 108 35" fill="none" stroke={INK} strokeWidth="5.6" strokeLinecap="round" />
      <path d="M94 24 C99 28 104 32 108 35" fill="none" stroke={silks} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M110 36 C120 38 136 39 147 41" fill="none" stroke="#5b3a22" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="110" cy="36" r="2.9" fill={INK} />
    </svg>
  );
}

/* Re-renders only when the pose changes, not on every animation frame. */
export default memo(CartoonHorse);