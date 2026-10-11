import MiniChipIcon from "../MiniChipIcon";

// The central pot banner for PvP mode — replaces the old Dealer panel. Shows
// the accumulated chip pool (sum of all equal wagers) for the current round.
export default function MpPotBanner({ pot = 0, commonWager = 0, active = false }) {
  const hasPot = Number(pot) > 0;
  return (
    <div
      className="rounded-2xl border p-3 transition-all"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(16,185,129,0.10))"
          : "rgba(255,255,255,0.06)",
        borderColor: active ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        boxShadow: active ? "0 0 22px rgba(212,175,55,0.18)" : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
          Total Pot
        </span>
        {Number(commonWager) > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">
            {commonWager} chip buy-in
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 py-1">
        <MiniChipIcon size={22} />
        <span className="text-2xl font-black text-amber-300 tabular-nums">
          {hasPot ? pot : "—"}
        </span>
      </div>
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-emerald-100/60">
        Winner takes all
      </p>
    </div>
  );
}