import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import HorseSilhouette from "./HorseSilhouette";
import { STAKE_OPTIONS, grossPayout } from "@/lib/horseRacing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** One horse, one stake, one bet per day. Chips leave the wallet on confirmation. */
export default function HorseBetSlip({ horses, selected, onSelect, stake, onStake, balance, busy, error, onConfirm, locked }) {
  const [confirming, setConfirming] = useState(false);
  const horse = horses.find((h) => h.id === selected) || null;
  const affordable = balance >= stake;

  if (locked) {
    return (
      <div className="rounded-2xl border border-border bg-white/95 p-4 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Betting closed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Today&apos;s race has started. Bets reopen at 00:00 Brunei time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white/95 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Place your bet
        </p>
        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          <MiniChipIcon size={13} />
          {balance}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {horses.map((h) => {
          const active = selected === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onSelect(h.id)}
              className={`relative flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                active
                  ? "border-amber-500 bg-amber-50 shadow-sm"
                  : "border-border bg-muted/40 hover:bg-muted"
              }`}
            >
              <HorseSilhouette number={h.number} size={42} />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold leading-tight text-foreground">
                {h.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {STAKE_OPTIONS.map((amount) => {
          const active = stake === amount;
          return (
            <button
              key={amount}
              onClick={() => onStake(amount)}
              className={`flex flex-col items-center rounded-xl border py-2 transition-all ${
                active
                  ? "border-amber-500 bg-amber-50 shadow-sm"
                  : "border-border bg-muted/40 hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-1 text-sm font-black tabular-nums text-foreground">
                <MiniChipIcon size={13} />
                {amount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                wins {grossPayout(amount)}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700">{error}</p>
      )}

      <button
        onClick={() => setConfirming(true)}
        disabled={busy || !selected || !affordable}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-[0_2px_10px_rgba(212,175,55,0.4)] transition hover:brightness-105 disabled:opacity-40"
      >
        <Lock className="h-3.5 w-3.5" /> Lock in {stake} chips
      </button>
      {!affordable && (
        <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-rose-600">
          Not enough chips — top up in the Cashier
        </p>
      )}

      <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
        One bet per day. Chips are deducted the moment you confirm. Every horse has an equal chance of
        winning.
      </p>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your bet?</AlertDialogTitle>
            <AlertDialogDescription>
              {horse ? (
                <>
                  You are staking <strong>{stake} chips</strong> on{" "}
                  <strong>
                    #{horse.number} {horse.name}
                  </strong>
                  . A win pays <strong>{grossPayout(stake)} chips</strong>. Chips are deducted now and the
                  bet cannot be changed or cancelled.
                </>
              ) : (
                "Pick a horse first."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              style={{ background: "#d4af37", color: "#052e22" }}
            >
              Confirm bet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}