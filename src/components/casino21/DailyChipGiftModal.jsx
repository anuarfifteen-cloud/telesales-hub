import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";
import { logChipMovement } from "@/lib/chipLog";
import { bruneiToday } from "@/lib/bruneiDay";

// One free gift per Brunei day, per user.
export const DAILY_GIFT_CHIPS = 5;

/**
 * Compact daily gift popup for Blackjack 21: a free 5-chip present the player
 * can claim once per Brunei day. The claim writes the chip balance and today's
 * Brunei date onto the user record (the Daily Spin mechanic), so a claim on one
 * device blocks the popup everywhere until the date rolls over at 00:00.
 */
export default function DailyChipGiftModal({ user, open, onClose, onClaimed }) {
  const [claiming, setClaiming] = useState(false);

  if (!open) return null;

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);

    const fresh = await base44.auth.me();
    // Bail out if another device claimed while this popup was open.
    if (fresh?.last_chip_gift_date === bruneiToday()) {
      setClaiming(false);
      onClose();
      return;
    }

    const currentChips = Number(fresh?.casinoChips) || 0;
    await base44.auth.updateMe({
      casinoChips: currentChips + DAILY_GIFT_CHIPS,
      last_chip_gift_date: bruneiToday(),
    });
    await logChipMovement({
      user,
      action_type: "win",
      amount: DAILY_GIFT_CHIPS,
      balance_after: currentChips + DAILY_GIFT_CHIPS,
      detail: `Daily free gift — ${DAILY_GIFT_CHIPS} chips`,
    });

    toast.success(`+${DAILY_GIFT_CHIPS} free chips claimed!`);
    await onClaimed?.();
    setClaiming(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[276px] rounded-3xl border border-amber-400/40 px-5 py-6 text-center"
        style={{
          background: "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-950/50 border border-emerald-400/20 text-emerald-100/70 hover:text-white transition"
        >
          <X className="w-3.5 h-3.5 mx-auto" />
        </button>

        <span style={{ fontSize: 42, lineHeight: 1 }}>🎁</span>

        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
          Daily Free Gift
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <MiniChipIcon size={26} />
          <span className="text-2xl font-black tabular-nums text-amber-200">
            +{DAILY_GIFT_CHIPS}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/70">
            chips
          </span>
        </div>

        <p className="mt-2 text-[11px] text-emerald-100/60">
          One free gift every day — claim it now.
        </p>

        <button
          onClick={claim}
          disabled={claiming}
          className="mt-4 w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 disabled:opacity-50 hover:brightness-105 transition flex items-center justify-center gap-2"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim"}
        </button>
      </div>
    </div>
  );
}