import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import HandPanel from "../HandPanel";
import { BLIND_WAIT_MS, stakeLabel, stakeTypeOf } from "@/lib/beatMyHand";

// The waiting client checks the shared record exactly once every five seconds —
// never faster — and stops the moment the match settles, is voided, or this
// screen closes. The on-screen countdown is a local clock and costs nothing.
const POLL_MS = 5000;

export default function BlindWaitScreen({
  challenge,
  myCards = [],
  myScore = 0,
  onSettled,
  onVoid,
  onTimeout,
}) {
  const [deadline, setDeadline] = useState(Number(challenge?.settle_deadline) || 0);
  const [now, setNow] = useState(Date.now());
  const stoppedRef = useRef(false);
  const timeoutFiredRef = useRef(false);
  const cbRef = useRef({ onSettled, onVoid, onTimeout });
  cbRef.current = { onSettled, onVoid, onTimeout };

  // Screen clock only — this never reaches the database.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!challenge?.id) return undefined;
    stoppedRef.current = false;
    let cancelled = false;

    const check = async () => {
      if (cancelled || stoppedRef.current || document.hidden) return;
      try {
        const row = await base44.entities.BeatMyHandChallenge.get(challenge.id);
        if (cancelled || !row) return;
        if (Number(row.settle_deadline) > 0) setDeadline(Number(row.settle_deadline));
        const bothHandsIn =
          Number(row.creator_submitted_at) > 0 && Number(row.opponent_submitted_at) > 0;
        if (row.status === "settled" || (row.status === "open" && bothHandsIn)) {
          stoppedRef.current = true;
          cbRef.current.onSettled?.(row);
        } else if (row.status !== "open") {
          stoppedRef.current = true;
          cbRef.current.onVoid?.(row);
        }
      } catch {
        // A failed check is simply retried on the next tick.
      }
    };

    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      stoppedRef.current = true;
      clearInterval(id);
    };
  }, [challenge?.id]);

  const left = deadline
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : Math.round(BLIND_WAIT_MS / 1000);

  // The window closed with one hand still missing: void it once, from here.
  useEffect(() => {
    if (!deadline || left > 0 || timeoutFiredRef.current || stoppedRef.current) return;
    timeoutFiredRef.current = true;
    cbRef.current.onTimeout?.(challenge);
  }, [left, deadline, challenge]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
          Blind play
        </p>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm font-bold text-emerald-50">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
          Waiting for opponent…
        </p>
        <p className="mt-2 text-3xl font-black leading-none tabular-nums text-amber-200">
          {left}s
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (left / Math.round(BLIND_WAIT_MS / 1000)) * 100)
              )}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[9px] text-emerald-100/40">
          Checking the table every 5 seconds ·{" "}
          {stakeLabel(challenge?.wager, stakeTypeOf(challenge))} at stake
        </p>
      </div>

      <HandPanel
        title="YOUR FINAL HAND"
        value={Number(myScore) || 0}
        cards={Array.isArray(myCards) ? myCards : []}
      />

      <p className="text-center text-[9px] leading-relaxed text-emerald-100/35">
        Your score is locked in. If the opponent doesn&apos;t finish in time the match is voided
        and both stakes are returned.
      </p>
    </div>
  );
}