// Reusable mini black/gold casino chip — matches the Cashier's Black/Gold bundle.
// Used inline next to chip counts across Casino 21.
export default function MiniChipIcon({ size = 14, className = "" }) {
  return (
    <span
      className={`relative inline-block rounded-full align-middle flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #2a2a2a, #1a1a1a 65%)",
        border: "1.5px solid #ffffff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
      }}
    >
      <span
        className="absolute rounded-full border border-dashed"
        style={{ inset: 1.5, borderColor: "#d4af37" }}
      />
      <span
        className="absolute rounded-full border"
        style={{ inset: 3, borderColor: "rgba(212,175,55,0.5)" }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center font-black leading-none"
        style={{
          color: "#d4af37",
          fontSize: size * 0.45,
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        ★
      </span>
    </span>
  );
}