/**
 * One folder on the desk. Closed folders carry only their number — the prize
 * value is passed in exclusively once the folder has been opened.
 */
export default function CloserFolder({ number, value, open, lucky, disabled, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={`Folder ${number}`}
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-[6px] transition-all duration-300 ${
        open ? "" : "active:scale-[0.97]"
      } ${lucky ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-black/50" : ""}`}
      style={
        open
          ? {
              background: "linear-gradient(160deg,#0f2a20 0%,#07130f 100%)",
              boxShadow: "inset 0 0 0 1px rgba(212,175,55,0.4), 0 1px 3px rgba(0,0,0,0.5)",
            }
          : {
              background: "linear-gradient(158deg,#f7e9c9 0%,#e9d4a7 52%,#d2b681 100%)",
              boxShadow:
                "0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(120,90,40,0.25)",
            }
      }
    >
      {!open && (
        <span
          className="absolute left-1/2 top-0 h-[3px] w-1/2 -translate-x-1/2 rounded-b-[2px]"
          style={{ background: "#c6a468" }}
        />
      )}

      {open ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-amber-200/45">
            {number}
          </span>
          <span className="font-display text-[13px] font-bold leading-none tabular-nums text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {value}
          </span>
        </span>
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center">
          <span className="font-display text-base font-bold leading-none text-[#6d4d1b]">
            {number}
          </span>
          {lucky && (
            <span className="mt-0.5 text-[6px] font-black uppercase tracking-[0.16em] text-[#8a5a12]">
              yours
            </span>
          )}
        </span>
      )}
    </button>
  );
}