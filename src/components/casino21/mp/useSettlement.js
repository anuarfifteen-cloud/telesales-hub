import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import { normalizeSeats, payoutFor } from "./mpEngine";

// Client-driven self-payout: when this player's seat carries a finished
// payout_flag, their own client credits their own casinoChips and then marks
// the seat settled so it can never be settled twice.
//
// Best-effort by design — the flag flip happens after the wallet write, so a
// crash in between could re-credit. A per-round browser guard keeps the
// duplicate inside one browser away, and the flag stops repeats everywhere else.
export default function useSettlement({ table, user, patch, onUserUpdate }) {
  const busyRef = useRef(false);
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

        // Mark settled using the freshest seats we have, so we don't wipe
        // another player's seat that just changed.
        const latest = normalizeSeats(ref.current.table?.seats);
        await snapshot.patch({
          seats: latest.map((s) =>
            s.seat_id === seat.seat_id
              ? { ...s, bet_chips: 0, payout_claimed: true, status: "betting" }
              : s
          ),
        });
      } catch (e) {
        console.warn("Multiplayer payout failed:", e);
      } finally {
        busyRef.current = false;
      }
    })();
  }, [pending, flag, mine?.seat_id, mine?.bet_chips, mine?.payout_amount]);
}