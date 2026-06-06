import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TZ = "Asia/Brunei";

function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// Prize table
const PRIZES = [
  { label: "No Luck! 😢",    tokens: 0, isWinner: false, color: "from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700", border: "border-slate-300 dark:border-slate-600", emoji: "😢", lockDate: true },
  { label: "1 Token! 🪙",    tokens: 1, isWinner: true,  color: "from-amber-50 to-yellow-100 dark:from-amber-950/60 dark:to-yellow-900/40", border: "border-amber-300 dark:border-amber-700", emoji: "🪙", lockDate: true },
  { label: "Spin Again! 🔄", tokens: 0, isWinner: false, color: "from-sky-50 to-blue-100 dark:from-sky-950/60 dark:to-blue-900/40", border: "border-sky-300 dark:border-sky-600", emoji: "🔄", lockDate: false },
  { label: "Lucky Two! 🌟",  tokens: 2, isWinner: true,  color: "from-emerald-50 to-green-100 dark:from-emerald-950/60 dark:to-green-900/40", border: "border-emerald-300 dark:border-emerald-700", emoji: "🌟", lockDate: true },
  { label: "JACKPOT! 💎",   tokens: 3, isWinner: true,  color: "from-violet-50 to-purple-100 dark:from-violet-950/60 dark:to-purple-900/40", border: "border-violet-400 dark:border-violet-600", emoji: "💎", lockDate: true },
];

function rollPrize() {
  const roll = Math.random();
  if (roll < 0.45) return PRIZES[0]; // No Luck
  if (roll < 0.75) return PRIZES[1]; // 1 Token
  if (roll < 0.90) return PRIZES[2]; // Spin Again
  if (roll < 0.97) return PRIZES[3]; // 2 Tokens
  return PRIZES[4];                  // Jackpot
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

// ── Result Modal ──────────────────────────────────────────────────────────────
function SpinResultModal({ prize, onClaim, claiming }) {
  if (!prize) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={`w-full max-w-xs rounded-3xl border-2 bg-gradient-to-br ${prize.color} ${prize.border} shadow-2xl p-6 flex flex-col items-center gap-4 text-center`}
        >
          <div className="text-6xl">{prize.emoji}</div>
          <div>
            <h2 className="text-2xl font-black text-foreground leading-tight">{prize.label}</h2>
            {prize.tokens > 0 && (
              <p className="text-sm text-muted-foreground mt-1.5">
                +{prize.tokens} token{prize.tokens > 1 ? "s" : ""} added to your balance!
              </p>
            )}
            {!prize.lockDate && (
              <p className="text-sm text-sky-600 dark:text-sky-400 font-semibold mt-1.5">
                You can spin again today!
              </p>
            )}
          </div>
          <Button
            onClick={onClaim}
            disabled={claiming}
            className="w-full font-black tracking-wide bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-2xl py-3"
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : prize.lockDate ? "Claim & Close" : "Got it!"}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function DailySpinWheel({ user, onUserUpdate }) {
  const [activePrize, setActivePrize] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const queryClient = useQueryClient();

  const today = getBruneiToday();
  const alreadySpun = user?.last_spin_date === today;

  const handleSpin = () => {
    if (alreadySpun || !user) return;
    const prize = rollPrize();
    setActivePrize(prize);
  };

  const handleClaim = async () => {
    if (!activePrize) return;
    setClaiming(true);

    const updates = {};
    // Only lock the date if it's NOT a "Spin Again"
    if (activePrize.lockDate) {
      updates.last_spin_date = today;
    }

    // Award tokens if any
    if (activePrize.tokens > 0) {
      const freshUser = await base44.auth.me();
      updates.earlyAccessTokens = (freshUser?.earlyAccessTokens ?? 0) + activePrize.tokens;
    }

    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
    }

    // Log to SpinActivityLog
    await base44.entities.SpinActivityLog.create({
      user_name: user.full_name || user.email,
      prize_text: activePrize.label,
      is_winner: activePrize.isWinner,
      created_at: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ["spinWinners"] });

    if (activePrize.tokens > 0) {
      toast.success(`+${activePrize.tokens} token${activePrize.tokens > 1 ? "s" : ""} added! 🎉`);
    } else if (activePrize.lockDate) {
      toast.info("Better luck tomorrow!");
    }

    await onUserUpdate();
    setClaiming(false);
    setActivePrize(null);
  };

  return (
    <>
      {/* Trigger Card */}
      <div
        onClick={alreadySpun ? undefined : handleSpin}
        className={`w-full rounded-xl p-6 shadow-lg flex items-center justify-between transition-opacity ${
          alreadySpun
            ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white cursor-pointer hover:opacity-90"
        }`}
      >
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">🎡 {alreadySpun ? "Come back tomorrow!" : "Daily Spin Wheel"}</h3>
          {!alreadySpun && <p className="text-sm opacity-90 mt-1">Spin once a day to win free tokens!</p>}
        </div>
        {!alreadySpun && (
          <div className="bg-white/20 px-4 py-2 rounded-full font-bold text-sm backdrop-blur-sm whitespace-nowrap">
            Spin Now
          </div>
        )}
      </div>

      {/* Winner Feed */}
      <WinnerFeed />

      {/* Result Modal */}
      <SpinResultModal prize={activePrize} onClaim={handleClaim} claiming={claiming} />
    </>
  );
}