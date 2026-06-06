import { useState, useRef } from "react";
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
  { label: "No Luck! 😢",    tokens: 0, isWinner: false, emoji: "😢", lockDate: true,  wheelColor: "#ef4444", textColor: "#fff" },
  { label: "1 Token! 🪙",    tokens: 1, isWinner: true,  emoji: "🪙", lockDate: true,  wheelColor: "#3b82f6", textColor: "#fff" },
  { label: "Spin Again! 🔄", tokens: 0, isWinner: false, emoji: "🔄", lockDate: false, wheelColor: "#eab308", textColor: "#1e293b" },
  { label: "Lucky Two! 🌟",  tokens: 2, isWinner: true,  emoji: "🌟", lockDate: true,  wheelColor: "#22c55e", textColor: "#fff" },
  { label: "JACKPOT! 💎",   tokens: 3, isWinner: true,  emoji: "💎", lockDate: true,  wheelColor: "#f59e0b", textColor: "#1e293b" },
];

function rollPrizeIndex() {
  const roll = Math.random();
  if (roll < 0.45) return 0; // No Luck
  if (roll < 0.75) return 1; // 1 Token
  if (roll < 0.90) return 2; // Spin Again
  if (roll < 0.97) return 3; // 2 Tokens
  return 4;                  // Jackpot
}

// ── Conic gradient wheel ──────────────────────────────────────────────────────
function WheelGraphic({ rotation }) {
  const sliceAngle = 360 / PRIZES.length; // 72deg each

  // Build conic-gradient clockwise, slice 0 starts at 0deg (top)
  const stops = PRIZES.map((p, i) => {
    const start = i * sliceAngle;
    const end = start + sliceAngle;
    return `${p.wheelColor} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
      {/* Pointer arrow at top */}
      <div
        className="absolute z-10"
        style={{ top: -18, left: "50%", transform: "translateX(-50%)" }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "22px solid #1e293b",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
          }}
        />
      </div>

      {/* Spinning wheel */}
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `conic-gradient(${stops})`,
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? "transform 4s cubic-bezier(0.1, 0, 0, 1)" : "none",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          border: "4px solid white",
        }}
      />

      {/* Slice labels */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          width: 260,
          height: 260,
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? "transform 4s cubic-bezier(0.1, 0, 0, 1)" : "none",
        }}
      >
        {PRIZES.map((p, i) => {
          const angleDeg = i * sliceAngle + sliceAngle / 2; // center of slice
          const angleRad = ((angleDeg - 90) * Math.PI) / 180;
          const r = 85; // distance from center
          const x = 130 + r * Math.cos(angleRad);
          const y = 130 + r * Math.sin(angleRad);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                color: p.textColor,
                fontSize: 11,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1.2,
                width: 52,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ fontSize: 16 }}>{p.emoji}</div>
            </div>
          );
        })}
      </div>

      {/* Center hub */}
      <div
        className="absolute rounded-full bg-white shadow-md flex items-center justify-center"
        style={{ width: 36, height: 36, border: "3px solid #e2e8f0", zIndex: 5 }}
      >
        <span style={{ fontSize: 14 }}>🎡</span>
      </div>
    </div>
  );
}

// ── Winner Feed ───────────────────────────────────────────────────────────────
function WinnerFeed() {
  const { data: winners = [] } = useQuery({
    queryKey: ["spinWinners"],
    queryFn: () => base44.entities.SpinActivityLog.filter({ is_winner: true }),
    refetchInterval: 30000,
  });

  const top3 = [...winners]
    .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date))
    .slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-border px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">⚡ Recent Winners</p>
      {top3.map((w, i) => (
        <div key={w.id || i} className="flex items-center gap-2 text-xs text-foreground">
          <span className="text-base leading-none">🏆</span>
          <span className="font-semibold">{w.user_name}</span>
          <span className="text-muted-foreground">just won</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">{w.prize_text}</span>
        </div>
      ))}
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
    const totalRotation = spinCountRef.current + (360 * 5) - (prizeIndex * 72) - 36;
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

    await base44.entities.SpinActivityLog.create({
      user_name: user.full_name || user.email,
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
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">🎡 Daily Spin Wheel</h2>
          {!spinning && !result && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl font-bold leading-none">×</button>
          )}
        </div>

        {/* Wheel */}
        <WheelGraphic rotation={rotation} />

        {/* Prize slices legend */}
        <div className="grid grid-cols-5 gap-1 w-full">
          {PRIZES.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-5 h-5 rounded-full border border-white/50" style={{ background: p.wheelColor }} />
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{p.emoji}</span>
            </div>
          ))}
        </div>

        {/* Result or Spin button */}
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
    queryClient.invalidateQueries({ queryKey: ["spinWinners"] });
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

      {/* Winner Feed */}
      <WinnerFeed />

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