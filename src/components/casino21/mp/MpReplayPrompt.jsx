import MiniChipIcon from "../MiniChipIcon";
import { Check, X } from "lucide-react";

// Shown to non-host seated players after the host initiates Play Again. The
// player accepts (joins the same-wager round) or declines (sits this one out).
// Non-response by the deadline counts as a decline.
export default function MpReplayPrompt({
  wager,
  secondsLeft = null,
  responded = false,
  onAccept,
  onDecline,
  busy = false,
}) {
  if (responded) {
    return (
      <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-200/80 py-2">
        <span className="w-3 h-3 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
        Response sent — waiting for the host to start…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/30 bg-emerald-950/40 px-3 py-3">
      <p className="text-center text-[11px] font-bold uppercase tracking-widest text-amber-200/80">
        Host wants a rematch
      </p>
      <div className="flex items-center justify-center gap-1.5 text-amber-200 font-black text-sm tabular-nums">
        <MiniChipIcon size={14} /> {wager} chips
      </div>
      {secondsLeft !== null && secondsLeft > 0 && (
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/60 tabular-nums">
          Respond in {secondsLeft}s
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          onClick={onAccept}
          disabled={busy}
          className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-950 disabled:opacity-40 transition"
          style={{ background: "#d4af37" }}
        >
          <Check className="inline mr-1 w-4 h-4" /> Accept
        </button>
        <button
          onClick={onDecline}
          disabled={busy}
          className="py-3 rounded-full font-black uppercase tracking-widest text-sm text-rose-50 bg-rose-700/60 border border-rose-400/40 disabled:opacity-40 transition"
        >
          <X className="inline mr-1 w-4 h-4" /> Decline
        </button>
      </div>
    </div>
  );
}