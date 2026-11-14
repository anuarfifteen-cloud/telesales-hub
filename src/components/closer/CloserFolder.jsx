import { FOLDER_COLORS } from "@/lib/closerTheme";

/**
 * One folder on the desk. Closed folders carry only their number — the prize
 * value is passed in exclusively once the folder has been opened.
 */
export default function CloserFolder({ number, value, open, lucky, disabled, onOpen }) {
  const color = FOLDER_COLORS[(number - 1) % FOLDER_COLORS.length];
  const kept = Boolean(open && lucky);
  const eliminated = Boolean(open && !lucky);

  const surface = eliminated
    ? {
        background: "linear-gradient(180deg,#C2C7CF 0%,#9098A2 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.35)",
      }
    : kept
      ? {
          background: "linear-gradient(180deg,#2B1B10 0%,#140B06 100%)",
          boxShadow: "inset 0 0 18px rgba(255,196,60,0.35)",
        }
      : {
          background: `linear-gradient(168deg,${color.body} 0%,${color.edge} 100%)`,
          boxShadow:
            "0 5px 12px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -3px 0 rgba(0,0,0,0.22)",
        };

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={`Folder ${number}`}
      className={`relative block w-full rounded-lg ${
        open ? "closer-flip" : "transition-transform duration-150 active:scale-95"
      } ${lucky ? "closer-lucky z-10" : ""}`}
      style={{
        aspectRatio: "3 / 3.7",
        ...surface,
        ...(lucky ? { border: "3px solid #FFD400" } : {}),
      }}
    >
      {!open && (
        <span
          className="absolute -top-[3px] left-[12%] h-[5px] w-[46%] rounded-t-[4px]"
          style={{ background: color.edge, filter: "brightness(0.92)" }}
        />
      )}

      {eliminated ? (
        <span className="flex h-full w-full flex-col items-center justify-center">
          <span className="text-[6px] font-bold uppercase tracking-[0.12em] text-slate-600">{number}</span>
          <span className="text-[11px] font-black tabular-nums leading-none text-slate-700 sm:text-sm">
            {value}
          </span>
        </span>
      ) : kept ? (
        <span className="flex h-full w-full flex-col items-center justify-center">
          <span className="text-[6px] font-bold uppercase tracking-[0.12em] text-amber-300/60">{number}</span>
          <span className="text-sm font-black tabular-nums leading-none text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:text-lg">
            {value}
          </span>
        </span>
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <span className="text-base font-black leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] sm:text-xl">
            {number}
          </span>
        </span>
      )}

      {lucky && (
        <span className="absolute inset-x-0 bottom-[7%] flex justify-center">
          <span className="whitespace-nowrap rounded-full bg-[#FFD400] px-1 py-[1px] text-[5px] font-black uppercase tracking-[0.06em] text-[#3A2A00] shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:text-[6px]">
            Your folder
          </span>
        </span>
      )}
    </button>
  );
}