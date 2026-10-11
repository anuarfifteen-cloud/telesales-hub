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
  pending = false,
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
  const submitting = pending;

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
          disabled={tooPoor || busy || submitting}
          className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
          style={{ background: "#d4af37" }}
        >
          {submitting ? "Submitting…" : `Set ${wager} Chip Buy-in`}
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

  // Host has set the buy-in; this player must Bet or Decline. The prompt pops
  // out centered over the table (like the result pop-out) as a raised felt
  // card: gold border, deep green gradient, soft shadow, card-arrive entrance.
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="mp-bet-card relative w-full max-w-sm"
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 17,
          border: "1px solid #c4a45e",
          borderRadius: 20,
          background: "linear-gradient(150deg,#123b2e 0%,#09271f 100%)",
          color: "#f2e6c5",
          fontFamily:
            'system-ui,-apple-system,"Segoe UI",sans-serif',
          boxShadow:
            "0 16px 36px rgba(12,43,32,.22),0 3px 9px rgba(12,43,32,.14),inset 0 1px rgba(255,255,255,.08)",
          animation: "mp-card-arrive .48s cubic-bezier(.2,.75,.25,1) both",
        }}
      >
        <div
          className="mp-bet-buyin"
          style={{
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "12px 14px",
            border: "1px solid rgba(220,185,105,.4)",
            borderRadius: 14,
            background: "rgba(3,25,19,.54)",
          }}
        >
          <span
            style={{
              margin: 0,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".13em",
              fontSize: 11,
              color: "#d9bd78",
            }}
          >
            Buy-in
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#f1d27e",
              fontSize: 15,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <MiniChipIcon size={16} /> {wager} chips
          </span>
        </div>

        {betSeconds !== null && betSeconds > 0 && (
          <p
            style={{
              margin: 0,
              alignSelf: "center",
              color: "#d9bd78",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".13em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Match window: {betSeconds}s
          </p>
        )}

        <div
          className="mp-bet-actions"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <button
            type="button"
            onClick={() => onPlace(wager)}
            disabled={cantMatch || busy || submitting}
            className="mp-bet-match"
            style={{
              boxSizing: "border-box",
              minWidth: 0,
              padding: "13px 9px",
              borderRadius: 999,
              font: '900 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif',
              textTransform: "uppercase",
              letterSpacing: ".09em",
              cursor: "pointer",
              border: "1px solid #f0d080",
              background: "linear-gradient(180deg,#e7c76e,#c39a42)",
              color: "#173328",
              boxShadow:
                "0 4px 12px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.45)",
              transition:
                "background-color .16s ease,color .16s ease,box-shadow .16s ease,transform .16s ease",
              opacity: cantMatch || busy ? 0.4 : 1,
            }}
          >
            Bet {wager} chips
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy || submitting}
            className="mp-bet-decline"
            style={{
              boxSizing: "border-box",
              minWidth: 0,
              padding: "13px 9px",
              borderRadius: 999,
              font: '900 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif',
              textTransform: "uppercase",
              letterSpacing: ".09em",
              cursor: "pointer",
              border: "1px solid rgba(219,151,133,.58)",
              background: "#642f2b",
              color: "#f7e8dc",
              boxShadow: "inset 0 1px rgba(255,255,255,.08)",
              transition:
                "background-color .16s ease,color .16s ease,box-shadow .16s ease,transform .16s ease",
              opacity: busy ? 0.4 : 1,
            }}
          >
            Decline
          </button>
        </div>

        {cantMatch && (
          <button
            onClick={onOpenCashier}
            className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80 hover:text-amber-200 transition"
          >
            Not enough chips to bet — buy chips in the Cashier, or Decline →
          </button>
        )}

        {submitting && (
          <p
            style={{
              margin: 0,
              alignSelf: "center",
              color: "#d9bd78",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".13em",
            }}
          >
            Submitting — waiting for the host…
          </p>
        )}
        <p
          style={{
            margin: 0,
            alignSelf: "center",
            color: "#cdb879",
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          Winner takes the whole pot
        </p>
      </div>
    </div>
  );
}