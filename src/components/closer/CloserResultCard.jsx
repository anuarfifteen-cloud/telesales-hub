import MiniChipIcon from "@/components/casino21/MiniChipIcon";

/** Final panel for a finished game — the buyout taken or the lucky folder opened. */
export default function CloserResultCard({ result, luckyValue, canPlay = true, onPlayAgain }) {
  const fromOffer = result?.source === "offer";

  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{
        background: "linear-gradient(180deg, rgba(41,26,74,0.96) 0%, rgba(20,12,40,0.97) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.16), 0 0 30px rgba(255,196,40,0.28), 0 20px 48px rgba(0,0,0,0.6)",
      }}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.26em] text-amber-200/70">
        {fromOffer ? "Deal" : "Your lucky folder"}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <MiniChipIcon size={20} />
        <span className="text-3xl font-black tabular-nums text-amber-300 drop-shadow-[0_0_12px_rgba(255,196,40,0.6)]">
          {result?.amount ?? 0}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-white/60">
        {fromOffer
          ? `Bought out by the Manager. Your folder was holding ${luckyValue}.`
          : "Paid straight into your chip balance."}
      </p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-3 w-full rounded-full py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#231000] transition hover:brightness-105"
        style={{
          background: "linear-gradient(180deg,#FFE07A 0%,#FFC107 55%,#F59E0B 100%)",
          boxShadow: "0 6px 18px rgba(255,175,20,0.45), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {canPlay ? "Play again · 100 chips" : "Back to the desk"}
      </button>
    </div>
  );
}