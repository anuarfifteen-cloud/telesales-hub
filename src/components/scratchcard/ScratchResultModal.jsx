import BlackChipIcon from "@/components/casino21/BlackChipIcon";
import { describeGrant } from "./scratchPrizes";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

// Result card shown once all nine squares are scratched. Styles are inline so the
// ticket reads the same in every app theme.
export default function ScratchResultModal({ granted, onClose }) {
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

        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}>
          {!isWin ? (
            <span style={{ fontSize: 56, lineHeight: 1 }}>🎫</span>
          ) : granted.type === "chips" ? (
            <BlackChipIcon size={60} />
          ) : granted.type === "tokens" ? (
            <img src={TOKEN_IMG} alt="token" style={{ width: 60, height: 60, objectFit: "contain" }} />
          ) : granted.type === "diamond" ? (
            <span style={{ fontSize: 56, lineHeight: 1 }}>💎</span>
          ) : (
            <span style={{ fontSize: 56, lineHeight: 1 }}>🎨</span>
          )}
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