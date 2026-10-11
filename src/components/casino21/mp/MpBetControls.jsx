import MiniChipIcon from "../MiniChipIcon";
import { MIN_BET, MAX_BET } from "./mpEngine";

// Wager picker for the PvP betting phase. Seat 1 (the host) sets the buy-in;
// every other seated player then sees Match / Decline within the 10-second
// match window. The host's slider is free until a wager lands; everyone else
// is locked to the host's amount.
export default function MpBetControls({
  bet,
  setBet,
  chips,
  busy,
  commonWager,
  isHost = false,
  betSeconds = null,
  onPlace,
  onDecline,
  onOpenCashier,
}) {
  const balance = Number(chips) || 0;
  const locked = Number(commonWager) > 0;
  const wager = locked
    ? Number(commonWager)
    : Math.min(
        Math.max(Number(bet) || MIN_BET, MIN_BET),
        Math.max(MIN_BET, Math.min(MAX_BET, balance))
      );
  const tooPoor = balance < MIN_BET;
  const cantMatch = locked && balance < wager;

  // Non-host waiting for the host to set the buy-in.
  if (!isHost && !locked) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-amber-400/20 bg-emerald-950/40 px-3 py-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200/80">
            Waiting for the host to set the buy-in…
          </p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 text-center">
          Seat 1 is the host · {MIN_BET}–{MAX_BET} chips · winner takes all
        </p>
      </div>
    );
  }

  // Host setting the buy-in (slider, no wager placed yet).
  if (isHost && !locked) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBet(Math.max(MIN_BET, wager - 1))}
            disabled={tooPoor || wager <= MIN_BET}
            className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
          >
            ‹
          </button>
          <input
            type="range"
            min={MIN_BET}
            max={Math.max(MIN_BET, Math.min(MAX_BET, balance))}
            step={1}
            value={wager}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={tooPoor}
            className="flex-1 accent-amber-400"
          />
          <button
            onClick={() => setBet(Math.min(MAX_BET, Math.min(balance, wager + 1)))}
            disabled={tooPoor || wager >= Math.min(MAX_BET, balance)}
            className="w-9 h-9 rounded-full bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
            <MiniChipIcon size={14} /> {wager} CHIPS
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200/60">
            host sets the buy-in
          </span>
        </div>
        <button
          onClick={() => onPlace(wager)}
          disabled={tooPoor || busy}
          className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
          style={{ background: "#d4af37" }}
        >
          Set {wager} Chip Buy-in
        </button>
        {tooPoor && (
          <button
            onClick={onOpenCashier}
            className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
          >
            You need {MIN_BET} chip to play — buy chips in the Cashier →
          </button>
        )}
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 text-center">
          {MIN_BET}–{MAX_BET} chips · winner takes the whole pot
        </p>
      </div>
    );
  }

  // Host has set the buy-in; this player must Match or Decline.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-emerald-950/40 px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
          Buy-in
        </span>
        <span className="flex items-center gap-1.5 text-amber-200 font-black text-sm tabular-nums">
          <MiniChipIcon size={14} /> {wager} chips
        </span>
      </div>

      {betSeconds !== null && betSeconds > 0 && (
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/70 tabular-nums">
          Match window: {betSeconds}s
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onPlace(wager)}
          disabled={cantMatch || busy}
          className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
          style={{ background: "#d4af37" }}
        >
          Match {wager}
        </button>
        <button
          onClick={onDecline}
          disabled={busy}
          className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-rose-50 bg-rose-700/60 border border-rose-400/40 disabled:opacity-40 transition"
        >
          Decline
        </button>
      </div>

      {cantMatch && (
        <button
          onClick={onOpenCashier}
          className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
        >
          Not enough chips to match — buy chips in the Cashier, or Decline →
        </button>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 text-center">
        Winner takes the whole pot
      </p>
    </div>
  );
}