/**
 * A single 16-bit style racehorse, drawn as plain pixel blocks on a fully
 * transparent SVG canvas — no image plate, no card frame. Four gallop frames
 * cycle the legs; the body, silk colours and number come from the day's horse.
 */
const VIEW_W = 32;
const VIEW_H = 24;

/** [x, y, w, h, tone] — tone 0 = coat, 1 = shadowed coat, 2 = hoof */
const GALLOP = [
  // 0 · gathered
  [
    [10, 16, 2, 6, 1], [10, 21, 3, 2, 2],
    [7, 16, 2, 7, 0], [7, 21, 3, 2, 2],
    [21, 16, 2, 6, 1], [21, 21, 3, 2, 2],
    [18, 16, 2, 7, 0], [18, 21, 3, 2, 2],
  ],
  // 1 · full extension — hind legs back, forelegs reaching
  [
    [7, 16, 2, 3, 0], [4, 18, 2, 3, 0], [2, 21, 3, 2, 2],
    [10, 16, 2, 3, 1], [8, 19, 2, 2, 1], [7, 21, 2, 2, 2],
    [18, 16, 2, 3, 0], [21, 18, 2, 3, 0], [23, 21, 3, 2, 2],
    [21, 16, 2, 3, 1], [23, 19, 2, 2, 1], [24, 21, 2, 2, 2],
  ],
  // 2 · push off
  [
    [7, 16, 2, 3, 0], [3, 18, 2, 3, 0], [1, 21, 3, 2, 2],
    [10, 16, 2, 3, 1], [6, 19, 2, 2, 1], [5, 21, 2, 2, 2],
    [18, 16, 2, 7, 0], [18, 21, 3, 2, 2],
    [21, 16, 2, 6, 1], [21, 21, 3, 2, 2],
  ],
  // 3 · reach
  [
    [7, 16, 2, 5, 0], [7, 21, 3, 2, 2],
    [10, 16, 2, 4, 1], [12, 19, 2, 2, 1], [12, 21, 2, 2, 2],
    [18, 16, 2, 3, 0], [22, 18, 2, 3, 0], [24, 21, 3, 2, 2],
    [21, 16, 2, 3, 1], [24, 19, 2, 2, 1], [25, 21, 2, 2, 2],
  ],
];

function shade(hex, factor) {
  const raw = String(hex || "#a9662d").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const channel = (shift) => Math.round((((n >> shift) & 255) * factor));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

export default function PixelHorse({ frame = 0, coat = "#a9662d", silk = "#c81e3a", width = 48 }) {
  const shadow = shade(coat, 0.74);
  const mane = shade(coat, 0.45);
  const boots = shade(silk, 0.55);
  const legs = GALLOP[((frame % 4) + 4) % 4];
  const tones = [coat, shadow, "#12100e"];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* tail */}
      <rect x="4" y="8" width="2" height="8" fill={mane} />
      <rect x="2" y="11" width="2" height="6" fill={mane} />
      <rect x="6" y="9" width="2" height="5" fill={shadow} />
      {/* barrel + rump */}
      <rect x="6" y="9" width="6" height="8" fill={coat} />
      <rect x="8" y="10" width="14" height="7" fill={coat} />
      <rect x="8" y="15" width="14" height="2" fill={shadow} />
      {/* neck + head */}
      <polygon points="19,10 22,3 26,4 23,16" fill={coat} />
      <polygon points="19,9 22,2 23,2 20,10" fill={mane} />
      <rect x="23" y="2" width="5" height="5" fill={coat} />
      <rect x="27" y="5" width="4" height="2" fill={shadow} />
      <rect x="24" y="0" width="2" height="2" fill={coat} />
      <rect x="26" y="3" width="1" height="1" fill="#12100e" />
      <rect x="30" y="5" width="1" height="1" fill="#1a1410" />
      {/* jockey */}
      <rect x="13" y="1" width="4" height="3" fill="#f4f1e4" />
      <rect x="13" y="1" width="4" height="1" fill={silk} />
      <rect x="12" y="4" width="6" height="5" fill={silk} />
      <rect x="17" y="6" width="5" height="2" fill={silk} />
      <rect x="11" y="8" width="3" height="4" fill={boots} />
      {/* saddle */}
      <rect x="11" y="9" width="8" height="2" fill={shade(coat, 0.35)} />
      {/* legs */}
      {legs.map(([x, y, w, h, tone], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={tones[tone]} />
      ))}
    </svg>
  );
}