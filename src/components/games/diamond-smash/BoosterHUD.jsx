import { Loader2, Check, Lock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BOOSTER_DEFS } from "./BoosterShop";

// Colored glow shadow per booster — matches each accent gradient's hue so the
// "available" state feels alive and tappable (cyan / amber / magenta).
const GLOW = {
  time_freeze: "shadow-[0_0_18px_rgba(34,211,238,0.45)]",
  end_game: "shadow-[0_0_18px_rgba(251,191,36,0.45)]",
  move_boost: "shadow-[0_0_18px_rgba(217,70,239,0.45)]",
};

// Mid-game booster activation HUD. Max ONE booster per game session.
// Each booster carries a distinct vibrant gradient identity tied to its function:
//   Time Freeze  → cyan/blue   (time-based)
//   End-Game     → amber/orange (rewards)
//   Move Boost   → magenta/pink (game action)
// Locked / out-of-stock boosters keep the exact same card footprint — only the
// saturation + opacity drop and a lock overlay appears, so the row never shifts.
export default function BoosterHUD({
  user,
  phase,
  activatedBooster, // null | 'time_freeze' | 'end_game' | 'move_boost'
  boosterUsedThisGame,
  busy,
  onActivate,
  buying,
}) {
  const stock = user?.diamondSmashBoosters || {};
  const getStock = (id) => Number(stock[id]) || 0;
  const inPlay = phase === "playing";

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">
          ⚡ Boosters
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">
          1 per run
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {BOOSTER_DEFS.map((b) => {
          const owned = getStock(b.id);
          const isActivated = activatedBooster === b.id;
          // Locked if another booster already used, or this one already activated
          const locked = (boosterUsedThisGame && !isActivated) || isActivated;
          const noStock = owned <= 0;
          const disabled = !inPlay || busy || locked || noStock || buying;
          const isLockedState = locked || noStock;
          const shortName = b.name === "End-Game Conversion" ? "End-Game" : b.name.split(" ")[0];

          const buttonEl = (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActivate(b.id)}
              className={`group relative w-full flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-2.5 transition-all duration-200
                ${isActivated
                  ? "border-emerald-400/70 bg-emerald-500/15 ring-2 ring-emerald-400/50 shadow-[0_0_18px_rgba(52,211,153,0.45)]"
                  : isLockedState
                  ? `bg-gradient-to-b ${b.accent} grayscale opacity-50 border-white/20`
                  : `bg-gradient-to-b ${b.accent} border-white/30 hover:scale-[1.04] active:scale-95 ${GLOW[b.id] || ""}`}
                disabled:cursor-not-allowed`}
            >
              {/* Glossy top highlight line — white sheen on available, faint on locked */}
              <span
                className={`pointer-events-none absolute inset-x-3 top-0 h-px ${
                  isLockedState ? "bg-white/10" : "bg-white/40"
                }`}
              />

              {/* Icon orb — frosted white circle so the emoji pops on the gradient */}
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-lg shadow-inner ${
                  isLockedState ? "opacity-80" : "drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                }`}
              >
                <span className="leading-none">{b.icon}</span>
                {isActivated && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-black">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </span>

              <span className="text-center text-[9.5px] font-bold uppercase tracking-wider leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {shortName}
              </span>

              {/* Live stock badge — ×N pulled from user.diamondSmashBoosters[id] */}
              <span className="flex items-center gap-1 rounded-full border border-white/30 bg-black/25 px-2 py-0.5 text-[9.5px] font-black tabular-nums text-white">
                {buying ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  `×${owned}`
                )}
              </span>

              {/* Lock overlay for locked / out-of-stock — same footprint, no size change */}
              {isLockedState && !isActivated && (
                <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </button>
          );

          if (noStock && inPlay) {
            return (
              <Tooltip key={b.id}>
                <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
                <TooltipContent side="bottom">Buy in Shop below ↓</TooltipContent>
              </Tooltip>
            );
          }
          if (locked && !isActivated && inPlay) {
            return (
              <Tooltip key={b.id}>
                <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
                <TooltipContent side="bottom">Already used a booster this game</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={b.id}>{buttonEl}</div>;
        })}
      </div>
    </div>
  );
}