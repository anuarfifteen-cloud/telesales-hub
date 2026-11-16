import MiniChipIcon from "@/components/casino21/MiniChipIcon";

/**
 * How a taken buyout reads against the folder that was set aside. The headline
 * is the verdict, the body states exactly what the deal cost or won.
 */
function dealVerdict({ amount, folderValue, folderDiamond }) {
  if (folderDiamond) {
    return {
      headline: "HEARTBREAK!",
      body: `You took ${amount} Chips, but your folder was hiding the 💎 1 Diamond!`,
      tone: "text-rose-300",
    };
  }
  if (amount > folderValue) {
    return {
      headline: "BRILLIANT DEAL!",
      body: `You walked away with ${amount} Chips, and your folder only had ${folderValue}. You beat the VIP!`,
      tone: "text-emerald-300",
    };
  }
  if (amount < folderValue) {
    return {
      headline: "OUCH!",
      body: `You walked away with ${amount} Chips, but your folder had ${folderValue} inside! The VIP wins this round.`,
      tone: "text-rose-300",
    };
  }
  return {
    headline: "DEAD EVEN!",
    body: `You walked away with ${amount} Chips, exactly what your folder held.`,
    tone: "text-amber-300",
  };
}

/** Final panel for a finished game — the buyout taken or the lucky folder opened. */
export default function CloserResultCard({ result, canPlay = true, onPlayAgain }) {
  const fromOffer = result?.source === "offer";
  const diamond = result?.diamond === true;
  const amount = Number(result?.amount) || 0;
  const verdict = fromOffer
    ? dealVerdict({
        amount,
        folderValue: Number(result?.folderValue) || 0,
        folderDiamond: result?.folderDiamond === true,
      })
    : null;

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
        {diamond ? <span className="text-xl leading-none">💎</span> : <MiniChipIcon size={20} />}
        <span className="text-3xl font-black tabular-nums text-amber-300 drop-shadow-[0_0_12px_rgba(255,196,40,0.6)]">
          {amount}
        </span>
        {diamond && (
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-200">
            Diamond
          </span>
        )}
      </div>

      {fromOffer ? (
        <>
          <p className={`mt-2 text-[9px] font-black uppercase tracking-[0.08em] ${verdict.tone}`}>
            {verdict.headline}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-white/80">{verdict.body}</p>
        </>
      ) : (
        <p className="mt-1.5 text-[10px] leading-snug text-white/60">
          {diamond
            ? "Diamond Round won — paid straight into your diamond balance."
            : "Paid straight into your chip balance."}
        </p>
      )}

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