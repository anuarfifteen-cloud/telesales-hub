import { Loader2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Persistent booster inventory shop — rendered below the game canvas, always visible.
// Buying adds +1 to the booster's stock; no per-game limit.
export const BOOSTER_DEFS = [
  { id: "time_freeze", icon: "❄️", name: "Time Freeze", desc: "Pauses the timer 15s", accent: "from-cyan-400 to-blue-500" },
  { id: "end_game", icon: "💰", name: "End-Game Conversion", desc: "Leftover moves → +250 pts", accent: "from-amber-400 to-orange-500" },
  { id: "move_boost", icon: "⚡", name: "Move Boost", desc: "Adds +10 moves", accent: "from-fuchsia-400 to-pink-500" },
];

const COST = 5;

export default function BoosterShop({ user, onUserUpdate }) {
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const stock = user?.diamondSmashBoosters || {};
  const getStock = (id) => Number(stock[id]) || 0;

  const buy = async (id, name) => {
    if (getStock(id) >= 5) {
      toast.error("Max stock reached (5). Use some down to buy more.");
      return;
    }
    if (tokens < COST) {
      toast.error("Not enough tokens! You need 5 tokens to buy a booster.");
      return;
    }
    try {
      await base44.auth.updateMe({
        earlyAccessTokens: tokens - COST,
        diamondSmashBoosters: { ...stock, [id]: getStock(id) + 1 },
      });
      await onUserUpdate?.();
      toast.success(`✅ ${name} purchased! +1 stock.`);
    } catch (e) {
      toast.error("Purchase failed. Try again.");
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4 dark:bg-slate-900/80 dark:border-fuchsia-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300 flex items-center gap-1.5">
          🛒 Booster Shop
        </h3>
        <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/40 px-2.5 py-1">
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums flex items-center gap-1">{tokens}
              <img
                src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png"
                alt="token"
                className="w-3.5 h-3.5 object-contain inline-block"
              />
            </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {BOOSTER_DEFS.map((b) => {
          const owned = getStock(b.id);
          const afford = tokens >= COST;
          return (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5 dark:bg-slate-800/60"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${b.accent} text-white text-base flex-shrink-0`}>
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground truncate">{b.name}</p>
                <p className="text-[10px] text-muted-foreground leading-snug truncate">{b.desc}</p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 px-2 py-1 text-[10px] font-black text-fuchsia-600 dark:text-fuchsia-300 tabular-nums">
                x{owned}
              </span>
              {owned >= 5 ? (
                <button
                  disabled
                  className="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide bg-muted border border-border text-muted-foreground cursor-not-allowed"
                >
                  MAX
                </button>
              ) : (
                <button
                  onClick={() => buy(b.id, b.name)}
                  disabled={!afford}
                  className="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  5
                  <img
                    src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png"
                    alt="token"
                    className="w-3 h-3 object-contain"
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground text-center leading-snug">
        Buy anytime — stock carries between games. Activate one per match from the HUD during play.
      </p>
    </div>
  );
}