import { CARDS_PER_BATCH } from "@/lib/scratchAllocation";

/**
 * Both daily batch trackers, always visible.
 *
 * AM (00:00-11:59): Batch 1 is the active pool; Batch 2 is locked at 0/10 until noon.
 * PM (12:00-23:59): Batch 2 is the active pool; Batch 1 stays on screen with the
 * balance it was frozen at when the noon refill happened, marked Closed.
 */
export default function ScratchBatchAllowance({ remaining, morningRemaining, period, exhausted }) {
  const isMorning = period === "AM";
  // In the morning Batch 1 IS the live balance. After noon the frozen morning
  // figure is used, falling back to a full batch for a record that was already
  // on Batch 2 before the morning count started being kept.
  const batch1 = isMorning ? remaining : morningRemaining ?? CARDS_PER_BATCH;

  const rows = isMorning
    ? [
        { key: "am", text: `🎟️ Batch 1 (AM) · ${batch1}/${CARDS_PER_BATCH} · Active`, live: true },
        { key: "pm", text: `🔒 Batch 2 (PM) · 0/${CARDS_PER_BATCH} · Closed until 12:00 PM`, live: false },
      ]
    : [
        { key: "am", text: `🎟️ Batch 1 (AM) · ${batch1}/${CARDS_PER_BATCH} · Closed`, live: false },
        { key: "pm", text: `🎟️ Batch 2 (PM) · ${remaining}/${CARDS_PER_BATCH} · Active`, live: true },
      ];

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        {rows.map((row) => (
          <p
            key={row.key}
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.4,
              color: !row.live
                ? "rgba(255,215,106,0.5)"
                : exhausted
                ? "#fda4af"
                : "#ffd76a",
            }}
          >
            {row.text}
          </p>
        ))}
      </div>
    </div>
  );
}