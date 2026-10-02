// Visual chip stack reflecting the current bet (pure CSS, black/gold).
// Shown above the bet slider. Caps the rendered stack at 10 for layout.
export default function ChipStack({ bet }) {
  const count = Math.min(Math.max(Math.round(bet || 0), 0), 10);
  return (
    <div className="relative h-16 w-full flex items-end justify-center" aria-hidden>
      {count === 0 ? (
        <span className="text-emerald-100/30 text-[10px] uppercase tracking-widest pb-2">No bet</span>
      ) : (
        Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 26,
              height: 26,
              bottom: i * 4,
              background: "radial-gradient(circle at 35% 30%, #2a2a2a, #141414 65%)",
              border: "1.5px solid #d4af37",
              boxShadow: "0 1px 2px rgba(0,0,0,0.55)",
            }}
          />
        ))
      )}
    </div>
  );
}