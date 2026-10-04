// Pure-CSS black casino chip, drawn to match the Blackjack 21 Cashier's
// "Black / Gold" bundle: black face, white rim, gold dashed + solid rings and a
// gold star. Used wherever a chip is shown outside the casino table.
export default function BlackChipIcon({ size = 24, className = "" }) {
  const u = size / 56; // design is drawn at 56px and scaled from there
  const detailed = size >= 26;

  return (
    <div
      className={`relative rounded-full flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #3a3a3a, #111111 65%)",
        border: `${Math.max(1.5, 3 * u)}px solid #ffffff`,
        boxShadow: "0 2px 6px rgba(0,0,0,0.45), inset 0 0 6px rgba(0,0,0,0.45)",
      }}
      aria-hidden="true"
    >
      {detailed && (
        <>
          <div
            className="absolute rounded-full border-dashed"
            style={{
              inset: 4 * u,
              borderWidth: Math.max(1, 2 * u),
              borderColor: "rgba(212,175,55,0.7)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: 10 * u,
              borderWidth: Math.max(1, 2 * u),
              borderColor: "#d4af37",
            }}
          />
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          style={{
            color: "#d4af37",
            fontSize: Math.max(7, 13 * u),
            lineHeight: 1,
            fontWeight: 900,
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        >
          ★
        </span>
      </div>
    </div>
  );
}