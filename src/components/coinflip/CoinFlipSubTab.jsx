import { useState } from "react";
import CoinFlipStreak from "@/components/coinflip/CoinFlipStreak";
import Blackjack21Game from "@/components/casino21/Blackjack21Game";

// Coin Flip sub-tab with a mode toggle: Double or Nothing (coin flip) or
// Casino 21 (blackjack). The toggle sits above the game area.
export default function CoinFlipSubTab({ user, onUserUpdate }) {
  const [mode, setMode] = useState("coinflip"); // coinflip | casino21

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("coinflip")}
          className={`py-2.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
            mode === "coinflip"
              ? "text-white border-transparent shadow"
              : "text-muted-foreground border-border bg-muted hover:bg-muted/60"
          }`}
          style={mode === "coinflip" ? { background: "#1a237e" } : undefined}
        >
          🪙 Coin Flip
        </button>
        <button
          onClick={() => setMode("casino21")}
          className={`py-2.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
            mode === "casino21"
              ? "text-emerald-950 border-transparent shadow"
              : "text-muted-foreground border-border bg-muted hover:bg-muted/60"
          }`}
          style={mode === "casino21" ? { background: "#d4af37" } : undefined}
        >
          ♠️ Blackjack 21
        </button>
      </div>

      {mode === "coinflip" ? (
        <CoinFlipStreak user={user} onUserUpdate={onUserUpdate} />
      ) : (
        <Blackjack21Game user={user} onUserUpdate={onUserUpdate} />
      )}
    </div>
  );
}