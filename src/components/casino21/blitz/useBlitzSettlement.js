import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import { normalizeSeats, payoutFor } from "../mp/mpEngine";
import { insertAction } from "../mp/tableActions";

// Best-effort per-player payout for the Blitz tournament. When this player's
// seat carries a finished payout_flag (WINNER or SPLIT), their own client
// credits their casinoChips and then inserts a CLAIM action. The host marks
// the seat claimed and adds the user_id to paid_winner_ids.
//
// A per-round localStorage guard plus the paid_winner_ids array on the table
// minimize duplicate processing, but client-side tracking cannot guarantee
// exactly-once atomic payouts — the wallet credit and the table flag are
// separate writes, so a crash in between could re-credit on a refresh.
export default function useBlitzSettlement({ table, user, patch, onUserUpdate }) {
  const busyRef = useRef(false);
  const sentRef = useRef("");
  const ref = useRef({});
  ref.current = { table, user, patch, onUserUpdate };

  const seats = normalizeSeats(table?.seats);
  const mine = seats.find((s) => s.user_id && s.user_id === user?.id) || null;
  const flag = mine?.payout_flag;
  const paidIds = Array.isArray(table?.paid_winner_ids) ? table?.paid_winner_ids : [];
  const alreadyPaid = user?.id ? paidIds.includes(user.id) : false;
  const pending =
    !!mine && !!flag && (flag === "WINNER" || flag === "SPLIT") && !mine.payout_claimed && !alreadyPaid;

  useEffect(() => {
    if (!pending || busyRef.current) return;
    const snapshot = ref.current;
    if (!snapshot.table || !snapshot.user) return;
    const seat = normalizeSeats(snapshot.table.seats).find(
      (s) => s.seat_id === mine.seat_id
    );
    if (!seat) return;

    const sentKey = `${snapshot.table.round_id}_${seat.seat_id}`;
    if (sentRef.current === sentKey) return;

    const guardKey = `blitz_settled_${snapshot.table.round_id}_${seat.seat_id}`;
    busyRef.current = true;

    (async () => {
      try {
        const payout = payoutFor(seat.payout_flag, seat.bet_chips, seat.payout_amount);
        let seen = false;
        try { seen = localStorage.getItem(guardKey) === "1"; } catch { seen = false; }

        if (!seen && payout > 0) {
          try { localStorage.setItem(guardKey, "1"); } catch { /* private mode */ }
          const fresh = await base44.auth.me();
          const balance = Number(fresh?.casinoChips) || 0;
          const next = balance + payout;
          await base44.auth.updateMe({ casinoChips: next });
          await snapshot.onUserUpdate?.();
          logChipMovement({
            user: snapshot.user,
            action_type: "win",
            amount: payout,
            balance_after: next,
            detail: `Blitz Tournament — ${seat.payout_flag} (prize pool share ${payout})`,
          });
        }

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
        console.warn("Blitz payout failed:", e);
      } finally {
        busyRef.current = false;
      }
    })();
  }, [pending, flag, mine?.seat_id, mine?.payout_amount, alreadyPaid]);
}