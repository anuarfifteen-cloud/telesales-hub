import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MANAGER_PORTRAIT } from "@/lib/closerTheme";

/** The Manager's single buyout call — 85% of the true average, floored. */
export default function ManagerOfferModal({ open, offer, foldersLeft, busy, onAccept, onReject }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onReject();
      }}
    >
      <DialogContent
        className="max-w-[20rem] gap-0 rounded-3xl border-2 border-[#FFD400] bg-[#15102A] p-0 text-white"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,212,0,0.4), 0 0 34px rgba(255,196,40,0.42), 0 24px 60px rgba(0,0,0,0.75)",
        }}
      >
        <div className="p-4">
          <div className="flex items-start gap-2.5">
            <div
              className="h-14 w-14 shrink-0 rounded-full ring-2 ring-[#FFD400]"
              style={{ ...MANAGER_PORTRAIT, boxShadow: "0 0 16px rgba(255,196,40,0.45)" }}
              role="img"
              aria-label="The VIP Client"
            />
            <div className="flex-1 pt-1">
              <span className="inline-block rounded-md bg-[#FF8A1E] px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.18em] text-[#2B1600]">
                VIP Client
              </span>
              <DialogTitle className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                Incoming Client Offer
              </DialogTitle>
              <DialogDescription className="sr-only">
                The VIP Client&apos;s one and only buyout offer
              </DialogDescription>
            </div>
          </div>

          <div className="relative mt-3 rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
            <p className="text-center text-[12px] font-semibold leading-snug text-[#241A3D]">
              I&apos;ll give you{" "}
              <span className="font-black text-[#6D28D9]">{offer} CHIPS</span> to walk away right now.
            </p>
          </div>

          <p className="mt-2 text-center text-[8.5px] leading-snug text-white/45">
            That&apos;s 85% of the true average of the {foldersLeft} folders left and the one you set
            aside. This is the only offer you get.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-b from-[#F0524B] to-[#B81F18] py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:opacity-50"
              style={{
                boxShadow:
                  "inset 0 3px 7px rgba(0,0,0,0.5), inset 0 -2px 0 rgba(255,255,255,0.14), 0 7px 18px rgba(184,31,24,0.45)",
              }}
            >
              Take the deal ({offer} chips)
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-b from-[#FFE07A] to-[#F0A400] py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#2B1600] transition hover:brightness-105 disabled:opacity-50"
              style={{
                boxShadow: "0 7px 20px rgba(255,190,30,0.5), inset 0 1px 0 rgba(255,255,255,0.65)",
              }}
            >
              No deal (keep playing)
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}