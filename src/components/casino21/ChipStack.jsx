// Pure-CSS stack of black/gold casino chips visualizing the current bet (max 7).
export default function ChipStack({ bet }) {
  const count = Math.min(Math.max(Math.floor(bet) || 0, 0), 7);
  if (count === 0) return null;
  return (
    <div className="flex justify-center pointer-events-none select-none">
      <div className="relative" style={{ height: 28, width: 40 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: 8 + (i % 2) * 1.5,
              bottom: i * 3,
              width: 24,
              height: 7,
              background: "radial-gradient(circle at 35% 30%, #2a2a2a, #1a1a1a 65%)",
              border: "1.5px solid #ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="absolute rounded-full border border-dashed"
              style={{ inset: 1, borderColor: "#d4af37" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}