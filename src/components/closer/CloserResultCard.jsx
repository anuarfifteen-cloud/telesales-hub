import MiniChipIcon from "@/components/casino21/MiniChipIcon";

/** Final panel for a finished game — the buyout taken or the lucky folder opened. */
export default function CloserResultCard({ result, luckyValue, canPlay = true, onPlayAgain }) {
  const fromOffer = result?.source === "offer";

  return (
    <div
      className="rounded-2xl border border-amber-400/40 p-4 text-center"
      style={{ background: "linear-gradient(150deg,#12251d 0%,#0a1712 60%,#08120e 100%)" }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.26em] text-amber-300/70">
        {fromOffer ? "Deal" : "Your lucky folder"}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <MiniChipIcon size={22} />
        <span className="font-display text-3xl font-black tabular-nums text-amber-200">
          {result?.amount ?? 0}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-amber-100/70">
        {fromOffer
          ? `Bought out by the Manager. Your folder was holding ${luckyValue}.`
          : "Paid straight into your chip balance."}
      </p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-3.5 w-full rounded-full bg-amber-300 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b1712] shadow-[0_6px_18px_rgba(212,175,55,0.3)] transition hover:brightness-105"
      >
        {canPlay ? "Play again · 100 chips" : "Back to the desk"}
      </button>
    </div>
  );
}