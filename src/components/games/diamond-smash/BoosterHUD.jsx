import { Loader2, Check, Lock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BOOSTER_DEFS } from "./BoosterShop";

// Mid-game booster activation HUD. Max ONE booster per game session.
// Modern futuristic glass panels with neon accent lines and tabular stock badges.
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
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">
          ⚡ Boosters
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">
          1 per run
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {BOOSTER_DEFS.map((b) => {
          const owned = getStock(b.id);
          const isActivated = activatedBooster === b.id;
          // Locked if another booster already used, or this one already activated
          const locked = (boosterUsedThisGame && !isActivated) || isActivated;
          const noStock = owned <= 0;
          const disabled = !inPlay || busy || locked || noStock || buying;
          const shortName = b.name === "End-Game Conversion" ? "End-Game" : b.name.split(" ")[0];

          const buttonEl = (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActivate(b.id)}
              className={`group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-2.5 transition-all duration-200
                ${isActivated
                  ? "border-emerald-400/70 bg-emerald-500/10 ring-2 ring-emerald-400/50 shadow-[0_0_18px_rgba(52,211,153,0.45)]"
                  : locked
                  ? "border-white/10 bg-slate-900/40 opacity-45 grayscale"
                  : noStock
                  ? "border-dashed border-white/15 bg-slate-900/40 opacity-50"
                  : "border-white/15 bg-slate-900/50 backdrop-blur-md hover:border-white/35 hover:bg-slate-800/60 hover:scale-[1.04] hover:shadow-[0_0_18px_rgba(192,200,220,0.3)]"}
                disabled:cursor-not-allowed`}
            >
              {/* Neon top accent line */}
              <span
                className={`pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r ${b.accent} ${
                  isActivated || locked ? "opacity-30" : "opacity-80"
                }`}
              />
              {/* Icon orb */}
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${b.accent} text-lg text-white shadow-md ${
                  locked ? "opacity-60" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]"
                }`}
              >
                {b.icon}
                {isActivated && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-black">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="text-center text-[9.5px] font-bold uppercase tracking-wider leading-tight text-white/85">
                {shortName}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9.5px] font-black tabular-nums text-white/80">
                {buying ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : noStock ? (
                  <Lock className="h-2.5 w-2.5 opacity-70" />
                ) : (
                  `×${owned}`
                )}
              </span>
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