/** "THE CLOSER" progress header across the top of the desk scene. */
export default function CloserProgressBar({ progress = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      className="rounded-2xl px-2.5 pb-1.5 pt-1"
      style={{
        background: "linear-gradient(180deg, rgba(58,35,104,0.9) 0%, rgba(32,19,62,0.94) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), 0 6px 18px rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
      }}
    >
      <p className="text-center text-[9px] font-black uppercase tracking-[0.34em] text-white/90 sm:text-[10px]">
        The Closer
      </p>
      <div className="mt-1 h-[7px] w-full overflow-hidden rounded-full bg-black/50">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg,#FFD24A 0%,#FFA51F 100%)",
            boxShadow: "0 0 10px rgba(255,190,60,0.75)",
          }}
        />
      </div>
    </div>
  );
}