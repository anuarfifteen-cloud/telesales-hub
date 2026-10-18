import ChipLedger from "./ChipLedger";

// Blackjack 21 History — the player's full chip ledger for the Casual table,
// the Ranked table, and the wallet. Every entry carries the net chip change and
// the balance it left behind, so a win shows the chips it actually paid. The
// Ranked ledger also shows the chip balance with the season's 🏆RANK amount.
export default function BlackjackHistory({ userId, user }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Chip ledger
        </p>
        <p className="text-[10px] font-bold text-muted-foreground/70">
          Net change · balance after
        </p>
      </div>
      <ChipLedger userId={userId} chipBalance={Number(user?.casinoChips) || 0} />
    </div>
  );
}