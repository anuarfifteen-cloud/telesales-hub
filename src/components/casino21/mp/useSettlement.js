import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import { normalizeSeats, payoutFor } from "./mpEngine";
import { insertAction } from "./tableActions";

// Client-driven self-payout: when this player's seat carries a finished
// payout_flag, their own client credits their own casinoChips and then inserts
// a CLAIM action so the host (the sole table writer) marks the seat claimed.
// The seat is never written directly by the player, so it can never collide
// with a host write.
//
// Best-effort by design — the credit happens before the CLAIM is processed, so
// a crash in between could re-credit. A per-round browser guard keeps the
// duplicate inside one browser away, and the host-set payout_claimed flag stops
// repeats on every other device once processed.
export default function useSettlement({ table, user, patch, onUserUpdate }) {
  const busyRef = useRef(false);
  const sentRef = useRef("");
  const ref = useRef({});
  ref.current = { table, user, patch, onUserUpdate };

  const seats = normalizeSeats(table?.seats);
  const mine = seats.find((s) => s.user_id && s.user_id === user?.id) || null;
  const flag = mine?.payout_flag;
  const pending = !!mine && !!flag && flag !== "PENDING" && !mine.payout_claimed;

  useEffect(() => {
    if (!pending || busyRef.current) return;
    const snapshot = ref.current;
    if (!snapshot.table || !snapshot.user) return;
    const seat = normalizeSeats(snapshot.table.seats).find(
      (s) => s.seat_id === mine.seat_id
    );
    if (!seat) return;

    const sentKey = `${snapshot.table.round_id}_${seat.seat_id}`;
    if (sentRef.current === sentKey) return; // CLAIM already sent this round

    const guardKey = `mp_settled_${snapshot.table.round_id}_${seat.seat_id}_${seat.payout_flag}`;
    busyRef.current = true;

    (async () => {
      try {
        const bet = Number(seat.bet_chips) || 0;
        const payout = payoutFor(seat.payout_flag, bet, seat.payout_amount);

        let seen = false;
        try {
          seen = localStorage.getItem(guardKey) === "1";
        } catch {
          seen = false;
        }

        if (!seen) {
          try {
            localStorage.setItem(guardKey, "1");
          } catch {
            /* private mode — the seat flag still protects us */
          }
          if (payout > 0) {
            const fresh = await base44.auth.me();
            const balance = Number(fresh?.casinoChips) || 0;
            const next = balance + payout;
            await base44.auth.updateMe({ casinoChips: next });
            await snapshot.onUserUpdate?.();
            logChipMovement({
              user: snapshot.user,
              action_type:
                seat.payout_flag === "REFUND"
                  ? "push"
                  : "win",
              amount: payout,
              balance_after: next,
              detail: `Multiplayer Blackjack PvP — ${seat.payout_flag} (pot share ${payout})`,
            });
          }
        }

        // Ask the host to mark the seat claimed (sole-writer, collision-safe).
        await insertAction({
          table_id: snapshot.table.id,
          round_id: snapshot.table.round_id,
          user_id: snapshot.user.id,
          user_name: snapshot.user.full_name || snapshot.user.email?.split("@")[0] || "Player",
          action_type: "CLAIM",
          seat_id: seat.seat_id,
        });
        sentRef.current = sentKey;
      } catch (e) {
        console.warn("Multiplayer payout failed:", e);
      } finally {
        busyRef.current = false;
      }
    })();
  }, [pending, flag, mine?.seat_id, mine?.bet_chips, mine?.payout_amount]);
}