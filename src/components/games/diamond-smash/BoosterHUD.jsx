import { Loader2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BOOSTER_DEFS } from "./BoosterShop";

// Mid-game booster activation HUD. Max ONE booster per game session.
// Shows live stock from user.diamondSmashBoosters; 0-stock buttons are
// disabled with a "Buy in Shop" tooltip. Once one booster is used, the
// other two lock for the rest of the match.
export default function BoosterHUD({
  user,
  phase,
  activatedBooster,   // null | 'time_freeze' | 'end_game' | 'move_boost'
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
      <div className="grid grid-cols-3 gap-2">
        {BOOSTER_DEFS.map((b) => {
          const owned = getStock(b.id);
          const isActivated = activatedBooster === b.id;
          // Locked if another booster already used, or this one already activated
          const locked = (boosterUsedThisGame && !isActivated) || isActivated;
          const noStock = owned <= 0;
          const disabled = !inPlay || busy || locked || noStock || buying;

          const buttonEl = (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActivate(b.id)}
              className={`relative w-full flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all
                ${isActivated
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/40"
                  : locked
                  ? "border-border bg-muted/40 text-muted-foreground opacity-60"
                  : noStock
                  ? "border-dashed border-border bg-muted/30 text-muted-foreground opacity-70"
                  : "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 hover:bg-fuchsia-500/20 hover:scale-[1.03]"}
                disabled:cursor-not-allowed`}
            >
              <span className="text-lg leading-none">{b.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-center">
                {b.name === "End-Game Conversion" ? "End-Game" : b.name.replace(" ", "\u00A0")}
              </span>
              <span className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full
                ${isActivated ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                {buying ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `x${owned}`}
              </span>
              {isActivated && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px]">✅</span>
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