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
 * One prize ladder pinned to a side of the desk. Values still on the desk glow;
 * a value that has been opened on the desk dims to 30% straight away.
 */
export default function CloserPrizeBoard({ side, values = [], dimmed = [] }) {
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
      {values.map((value) => {
        const gone = dimmed.includes(value);
        return (
          <span
            key={value}
            className={`flex items-center gap-[2px] text-[8px] font-black tabular-nums leading-none transition-all duration-300 sm:text-[10px] ${
              gone ? "opacity-30 grayscale" : ""
            }`}
            style={
              gone
                ? { color: "#D8D4E6" }
                : { color: "#FFE6A8", textShadow: "0 0 8px rgba(255,199,60,0.9)" }
            }
          >
            <PrizeChip />
            {value}
          </span>
        );
      })}
    </div>
  );
}