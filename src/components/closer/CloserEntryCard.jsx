import { Lock } from "lucide-react";

const RULES = [
  "Stake 100 chips, then pick the one folder you will keep.",
  "Open folders on the desk one by one — each is money you don't win.",
  "With five folders left, the VIP Client makes a single buyout offer.",
  "Take the money, or open on until only your folder is left.",
];

/** The seat-up panel shown before a round begins. */
export default function CloserEntryCard({
  chips,
  remaining,
  loading,
  busy,
  affordable,
  limitReached,
  error,
  entryFee,
  onSit,
}) {
  return (
    <div
      className="w-full max-w-[15.5rem] rounded-2xl p-3"
      style={{
        background: "linear-gradient(180deg, rgba(41,26,74,0.93) 0%, rgba(22,13,44,0.95) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.16), 0 0 26px rgba(20,10,40,0.55), 0 16px 40px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
      }}
    >
      <p className="text-center text-[8px] font-black uppercase tracking-[0.26em] text-amber-200/70">
        House rules
      </p>

      <ul className="mt-2 space-y-1">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-1.5 text-[9px] leading-snug text-white/75">
            <span className="mt-[4px] h-1 w-1 shrink-0 rounded-full bg-amber-300/80" />
            {rule}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSit}
        disabled={busy || !affordable || limitReached || loading}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#231000] transition hover:brightness-105 disabled:opacity-45"
        style={{
          background: "linear-gradient(180deg,#FFE07A 0%,#FFC107 55%,#F59E0B 100%)",
          boxShadow: "0 6px 18px rgba(255,175,20,0.45), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        <Lock className="h-3 w-3" />
        {limitReached
          ? "Daily limit reached"
          : busy
            ? "Dealing…"
            : `Take a seat · ${entryFee} chips`}
      </button>

      <p className="mt-1.5 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-amber-200/55">
        {loading ? "Checking today's plays…" : `${remaining} plays left today`}
        <span className="mx-1 text-amber-200/30">·</span>
        {chips} chips
      </p>

      {!affordable && (
        <p className="mt-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-amber-300">
          You need {entryFee} chips — top up in the Cashier
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-rose-500/20 px-2 py-1.5 text-center text-[9px] font-semibold text-rose-100 ring-1 ring-rose-400/40">
          {error}
        </p>
      )}
    </div>
  );
}