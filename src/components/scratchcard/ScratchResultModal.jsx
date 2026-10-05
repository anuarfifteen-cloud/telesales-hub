import ScratchPrizeIcon from "./ScratchPrizeIcon";
import { describeGrant } from "./scratchPrizes";

// Result card shown once all nine squares are scratched — the ticket's single
// reveal, scaled up for the bigger prizes. Styles are inline so the ticket reads
// the same in every app theme.
const ICON_SIZE = { none: 60, small: 60, medium: 68, big: 78 };

export default function ScratchResultModal({ granted, tier = "small", onClose }) {
  const isWin = !!granted;
  const { headline, subtitle } = isWin
    ? describeGrant(granted)
    : {
        headline: "No Match",
        subtitle: "No three in a row on this ticket — buy another and try again.",
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,2,20,0.82)", backdropFilter: "blur(4px)" }}
    >
      <style>{`
        @keyframes scratchPop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 330,
          padding: 26,
          textAlign: "center",
          borderRadius: 26,
          background: "linear-gradient(165deg,#241448 0%,#160c2e 100%)",
          border: `3px solid ${isWin ? "#f0a92b" : "#64748b"}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,209,102,0.12)",
          animation: "scratchPop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, letterSpacing: 4, color: isWin ? "#ffd76a" : "#cbd5e1" }}>
          {isWin ? "🏆 WINNER" : "🎫 NO WIN"}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "16px 0 12px",
            filter: tier === "big" ? "drop-shadow(0 0 18px rgba(255,215,106,0.85))" : undefined,
          }}
        >
          <ScratchPrizeIcon granted={granted} size={ICON_SIZE[tier] || 60} />
        </div>

        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#ffffff", lineHeight: 1.15 }}>
          {headline}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.45 }}>
          {subtitle}
        </p>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "13px 0",
            borderRadius: 14,
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: 1,
            color: "#1a1030",
            background: "linear-gradient(180deg,#ffd76a,#f0a92b)",
            border: "3px solid #7c4a06",
            cursor: "pointer",
          }}
        >
          {isWin ? "COLLECT" : "CLOSE"}
        </button>
      </div>
    </div>
  );
}