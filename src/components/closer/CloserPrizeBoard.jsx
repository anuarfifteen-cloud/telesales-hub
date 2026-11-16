import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import { CHIP_ICON_URL } from "@/lib/closerTheme";

/**
 * Small black-and-yellow chip shown beside every prize amount.
 * Set CHIP_ICON_URL in src/lib/closerTheme.js to swap in a real chip image;
 * until then the app's built-in chip is drawn instead.
 */
function PrizeChip() {
  if (CHIP_ICON_URL) {
    return (
      <img src={CHIP_ICON_URL} alt="" aria-hidden="true" className="h-2 w-2 shrink-0 object-contain" />
    );
  }
  return <MiniChipIcon size={8} />;
}

/**
 * One prize ladder pinned to a side of the desk. Prizes still on the desk glow;
 * a slot opened on the desk dims to 30% straight away. A Mystery Wildcard reads
 * as a `?` until its folder opens, then shows the amount it really held. During
 * a Diamond Round the Diamond slot is labelled as its prize — the value stays
 * numeric everywhere else, so the offer maths is untouched.
 */
export default function CloserPrizeBoard({ side, slots = [] }) {
  return (
    <div
      className={`absolute top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full px-1 py-2 sm:gap-1.5 sm:px-1.5 sm:py-2.5 ${
        side === "left" ? "left-1 sm:left-1.5" : "right-1 sm:right-1.5"
      }`}
      style={{
        background: "linear-gradient(180deg, rgba(52,32,95,0.86) 0%, rgba(26,16,54,0.9) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 22px rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
      }}
    >
      {slots.map((slot) => {
        const mystery = Boolean(slot.isMystery) && !slot.revealed;
        const gone = Boolean(slot.gone);
        return (
          <span
            key={slot.base}
            className={`flex items-center gap-[2px] text-[8px] font-black tabular-nums leading-none transition-all duration-300 sm:text-[10px] ${
              gone ? "opacity-30 grayscale" : ""
            }`}
            style={
              gone
                ? { color: "#D8D4E6" }
                : { color: "#FFE6A8", textShadow: "0 0 8px rgba(255,199,60,0.9)" }
            }
          >
            {mystery ? (
              <span
                className="closer-mystery flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-black leading-none sm:h-3.5 sm:w-3.5 sm:text-[9px]"
                style={{
                  background: "linear-gradient(180deg,#8B5CF6 0%,#4C1D95 100%)",
                  color: "#FFE6A8",
                  boxShadow: "inset 0 0 0 1px rgba(255,230,168,0.75)",
                }}
                title="Mystery Wildcard — revealed when its folder opens"
              >
                ?
              </span>
            ) : slot.diamond ? (
              <span className="whitespace-nowrap text-[6px] tracking-[0.02em] sm:text-[8px]">
                💎 1 Diamond
              </span>
            ) : (
              <>
                <PrizeChip />
                {slot.value}
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}