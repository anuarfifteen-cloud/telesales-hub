import { CARDS_PER_BATCH } from "@/lib/scratchAllocation";

/**
 * Compact batch allowance. The morning window (Batch 1) is frozen at the noon
 * refill, so after 12 PM it stays on screen above the live afternoon batch
 * instead of disappearing with the reset.
 */
export default function ScratchBatchAllowance({ remaining, morningRemaining, period, exhausted }) {
  const isMorning = period === "AM";
  // In the morning Batch 1 IS the live balance. After noon the frozen morning
  // figure is used, falling back to a full batch for a record that was already
  // on Batch 2 before the morning count started being kept.
  const batch1 = isMorning ? remaining : morningRemaining ?? CARDS_PER_BATCH;

  const line = (text, dim) => (
    <p
      style={{
        margin: 0,
        textAlign: "center",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.4,
        color: dim ? "rgba(255,215,106,0.55)" : exhausted ? "#fda4af" : "#ffd76a",
      }}
    >
      🎟️ {text}
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {batch1 != null &&
        line(
          `Batch 1 (AM) · ${batch1}/${CARDS_PER_BATCH}${isMorning ? " left" : " · closed"}`,
          !isMorning
        )}
      {!isMorning && line(`Batch 2 (PM) · ${remaining}/${CARDS_PER_BATCH} left`, false)}
    </div>
  );
}