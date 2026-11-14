import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";

/** The Manager's single buyout call — 85% of the true average, floored. */
export default function ManagerOfferModal({ open, offer, foldersLeft, busy, onAccept, onReject }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onReject();
      }}
    >
      <DialogContent className="max-w-[19rem] rounded-3xl border border-amber-400/40 bg-[#0b1712] p-0 text-amber-50 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="p-5 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-300/70">
            The Manager
          </p>
          <DialogTitle className="mt-1 font-display text-xl text-amber-50">I&apos;ll buy your folder</DialogTitle>
          <DialogDescription className="sr-only">
            The Manager&apos;s one and only buyout offer
          </DialogDescription>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <MiniChipIcon size={22} />
            <span className="font-display text-4xl font-black tabular-nums text-amber-200">
              {offer}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-snug text-amber-100/70">
            That&apos;s 85% of the true average of the {foldersLeft} folders left on the desk and the
            one you set aside. This is the only offer you get.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="w-full rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b1712] shadow-[0_6px_18px_rgba(212,175,55,0.35)] transition hover:brightness-105 disabled:opacity-50"
            >
              Take the {offer} chips
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="w-full rounded-full border border-amber-300/35 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/90 transition hover:bg-white/5 disabled:opacity-50"
            >
              No deal
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}