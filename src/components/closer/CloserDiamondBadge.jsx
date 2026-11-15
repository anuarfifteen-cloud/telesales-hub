/** Glowing badge pinned over the desk on the +3 allowance's third play. */
export default function CloserDiamondBadge() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[10%] z-10 flex justify-center">
      <span
        className="animate-pulse whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] sm:text-[9px]"
        style={{
          background: "linear-gradient(180deg, rgba(56,189,248,0.96) 0%, rgba(14,116,144,0.96) 100%)",
          color: "#f0f9ff",
          boxShadow: "0 0 18px rgba(56,189,248,0.85), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        💎 Diamond Round Active
      </span>
    </div>
  );
}