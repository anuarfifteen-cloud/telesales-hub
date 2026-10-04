import { currentQuest, questProgress } from "./villageLogic";
import { QUEST_CHAIN } from "./villageConfig";

// "Current Quest" panel with a live progress bar and the token reward.
export default function VillageQuestPanel({ state }) {
  const quest = currentQuest(state);

  if (!quest) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Current Quest
        </p>
        <p className="mt-1 text-sm font-bold text-foreground">
          🏆 Every quest complete — {state.questsDone} done. Keep building!
        </p>
      </div>
    );
  }

  const progress = questProgress(state, quest);
  const pct = Math.round((progress / quest.target) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Current Quest
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{quest.label}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-amber-400/20 border border-amber-400/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
          +{quest.reward} 🪙
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-black text-foreground tabular-nums">
          {progress}/{quest.target}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Quest {state.questIndex + 1} of {QUEST_CHAIN.length} · {state.questsDone} completed
      </p>
    </div>
  );
}