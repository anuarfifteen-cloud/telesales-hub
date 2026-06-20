import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TZ = "Asia/Brunei";

function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// ── Prize table (order = slice index 0..4, clockwise from top) ────────────────
const PRIZES = [
  { label: "No Luck! 😢",     tokens: 0, isWinner: false, emoji: "😢", lockDate: true,  wheelColor: "#c0392b", textColor: "#fff",     dotColor: "bg-red-600"    },
  { label: "1 Token! 🪙",    tokens: 1, isWinner: true,  emoji: "🪙", lockDate: true,  wheelColor: "#1d4ed8", textColor: "#fff",     dotColor: "bg-blue-700"   },
  { label: "Spin Again! 🔄", tokens: 0, isWinner: false, emoji: "🔄", lockDate: false, wheelColor: "#d97706", textColor: "#1e293b",  dotColor: "bg-amber-600"  },
  { label: "Lucky Two! 🌟",  tokens: 2, isWinner: true,  emoji: "🌟", lockDate: true,  wheelColor: "#15803d", textColor: "#fff",     dotColor: "bg-green-700"  },
  { label: "JACKPOT! 💎",    tokens: 3, isWinner: true,  emoji: "💎", lockDate: true,  wheelColor: "#b45309", textColor: "#fff",     dotColor: "bg-yellow-700" },
];

function rollPrizeIndex() {
  const roll = Math.random();
  if (roll < 0.70) return 3; // 2 Tokens (70%)
  if (roll < 0.88) return 2; // Spin Again (18%)
  if (roll < 0.96) return 1; // 1 Token (8%)
  if (roll < 0.99) return 4; // Jackpot (4%)
  return 0;                  // No Luck (0%)
}

// ── Conic gradient wheel ──────────────────────────────────────────────────────
function WheelGraphic({ rotation }) {
  const sliceAngle = 360 / PRIZES.length; // 72deg each

  const stops = PRIZES.map((p, i) => {
    const start = i * sliceAngle;
    const end = start + sliceAngle;
    return `${p.wheelColor} ${start}deg ${end}deg`;
  }).join(", ");

  const spinStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: rotation > 0 ? "transform 4s cubic-bezier(0.1, 0, 0, 1)" : "none",
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: 284, height: 284 }}>
      {/* Premium pointer arrow */}
      <div
        className="absolute z-30"
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.5))",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "26px solid #facc15",
          }}
        />
      </div>

      {/* Outer carnival rim */}
      <div
        className="rounded-full"
        style={{
          width: 284,
          height: 284,
          background: "#1e1b4b",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3), inset 0 0 16px rgba(0,0,0,0.4)",
          border: "12px solid #312e81",
          padding: 4,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Spinning wheel disc */}
        <div
          style={{
            width: 244,
            height: 244,
            borderRadius: "50%",
            background: `conic-gradient(${stops})`,
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.25)",
            position: "relative",
            overflow: "hidden",
            ...spinStyle,
          }}
        />

        {/* Emoji overlay (spins with wheel) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ width: 244, height: 244, margin: "auto", ...spinStyle }}
        >
          {PRIZES.map((p, i) => {
            const angleDeg = i * sliceAngle + sliceAngle / 2;
            const angleRad = ((angleDeg - 90) * Math.PI) / 180;
            const r = 78;
            const x = 122 + r * Math.cos(angleRad);
            const y = 122 + r * Math.sin(angleRad);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                  fontSize: 22,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                }}
              >
                {p.emoji}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D center hub */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(to bottom, #ffffff, #d1d5db)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
          border: "4px solid #9ca3af",
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 20 }}>⭐</span>
      </div>
    </div>
  );
}

// ── Wheel Modal ───────────────────────────────────────────────────────────────
function WheelModal({ onClose, onClaim, user, today }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // PRIZES[index] after spin
  const [claiming, setClaiming] = useState(false);
  const spinCountRef = useRef(0);

  const handleSpin = () => {
    if (spinning || result) return;
    const prizeIndex = rollPrizeIndex();
    
    const baseRotation = Math.ceil(spinCountRef.current / 360) * 360;
    const totalRotation = baseRotation + (360 * 5) - (prizeIndex * 72) - 36;
    spinCountRef.current = totalRotation;
    setRotation(totalRotation);
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setResult(PRIZES[prizeIndex]);
    }, 4100);
  };

  const handleClaim = async () => {
    if (!result) return;
    setClaiming(true);

    const updates = {};
    if (result.lockDate) updates.last_spin_date = today;
    if (result.tokens > 0) {
      const freshUser = await base44.auth.me();
      updates.earlyAccessTokens = (freshUser?.earlyAccessTokens ?? 0) + result.tokens;
    }
    if (Object.keys(updates).length > 0) await base44.auth.updateMe(updates);

    if (result.tokens > 0) {
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
        amount: result.tokens,
        source: "Daily Spin",
        timestamp: new Date().toISOString(),
      });
    }

    // Force system to write authentic date signatures straight from creation context
    await base44.entities.SpinActivityLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Someone",
      prize_text: result.label,
      is_winner: result.isWinner,
      created_at: new Date().toISOString(),
    });

    if (result.tokens > 0) {
      toast.success(`+${result.tokens} token${result.tokens > 1 ? "s" : ""} added! 🎉`);
    } else if (result.lockDate) {
      toast.info("Better luck tomorrow!");
    }

    await onClaim();
    setClaiming(false);
  };

  const handleSpinAgain = () => {
    setResult(null);
    setSpinning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && !spinning && !result && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
        <div className="w-full flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">🎡 Daily Spin Wheel</h2>
          {!spinning && !result && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl font-bold leading-none">×</button>
          )}
        </div>

        <WheelGraphic rotation={rotation} />

        <div className="flex flex-wrap justify-center gap-2 mt-2 w-full">
          {PRIZES.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${p.dotColor}`} />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">{p.emoji} {p.label.replace(/[😢🪙🔄🌟💎]/g, "").trim()}</span>
            </div>
          ))}
        </div>

        {!result && (
          <Button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full h-12 text-base font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-2xl shadow-lg shadow-violet-200/40"
          >
            {spinning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Spinning…</> : "SPIN!"}
          </Button>
        )}

        {result && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="text-5xl">{result.emoji}</div>
            <h3 className="text-xl font-black text-foreground text-center">{result.label}</h3>
            {result.tokens > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                +{result.tokens} token{result.tokens > 1 ? "s" : ""} will be added to your balance!
              </p>
            )}
            {!result.lockDate && (
              <p className="text-sm text-sky-600 dark:text-sky-400 font-semibold text-center">You can spin again!</p>
            )}

            {result.lockDate ? (
              <Button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full font-black bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl"
              >
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim & Close"}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={handleSpinAgain}
                  className="w-full font-black bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl"
                >
                  Spin Again! 🔄
                </Button>
                <button onClick={onClose} className="text-xs text-muted-foreground underline text-center">
                  Close without spinning
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function DailySpinWheel({ user, onUserUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const today = getBruneiToday();
  const alreadySpun = user?.last_spin_date === today;

  const handleClaim = async () => {
    await onUserUpdate();
    setShowModal(false);
  };

  return (
    <>
      {/* Compact Banner */}
      <div className={`w-full rounded-xl p-3 shadow-md flex items-center justify-between mb-4 ${
        alreadySpun
          ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
          : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎡</span>
          <div>
            <p className="font-bold text-sm leading-tight">{alreadySpun ? "Come back tomorrow!" : "Daily Spin"}</p>
            {!alreadySpun && <p className="text-xs opacity-90">Spin to win tokens!</p>}
          </div>
        </div>
        {!alreadySpun && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-full font-bold text-sm transition-colors whitespace-nowrap"
          >
            Spin Now
          </button>
        )}
      </div>

      {/* Wheel Modal */}
      {showModal && (
        <WheelModal
          onClose={() => setShowModal(false)}
          onClaim={handleClaim}
          user={user}
          today={today}
        />
      )}
    </>
  );
}