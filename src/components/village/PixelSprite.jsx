// Renders a tiny pixel-art sprite as a crisp SVG.
// Identical pixels on a row are merged into one rect so a 12×12 sprite costs
// only a handful of DOM nodes instead of 144.
function rowRects(row, y) {
  const out = [];
  let x = 0;
  while (x < row.length) {
    const ch = row[x];
    let len = 1;
    while (x + len < row.length && row[x + len] === ch) len++;
    if (ch !== ".") out.push({ x, y, w: len, ch });
    x += len;
  }
  return out;
}

export default function PixelSprite({ sprite, className = "" }) {
  const { pixels, palette } = sprite;
  const height = pixels.length;
  const width = pixels[0].length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      {pixels.flatMap((row, y) =>
        rowRects(row, y).map((r, i) => (
          <rect
            key={`${y}-${i}`}
            x={r.x}
            y={y}
            width={r.w}
            height={1}
            fill={palette[r.ch]}
          />
        ))
      )}
    </svg>
  );
}