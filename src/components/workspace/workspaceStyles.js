// Shared surface styling for the Workspace tab.
// Every colour comes from the active app theme's own tokens (index.css), so the
// tab inherits whatever theme the member has selected instead of hardcoding one.
// Literal class strings only, so Tailwind keeps every one of them.

export const CARD = "rounded-3xl border border-border bg-card p-4 shadow-sm";

export const LABEL =
  "mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground";

export const INPUT =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

export const PREVIEW =
  "block w-full min-h-[13rem] resize-y rounded-2xl border border-border bg-background p-3 font-mono text-[11.5px] leading-relaxed text-foreground focus:border-primary focus:outline-none";

export const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-primary-foreground transition hover:brightness-105 active:scale-[0.99]";

export const PILL_ACTIVE = "bg-primary text-primary-foreground";

export const PILL_IDLE =
  "border border-border bg-secondary text-secondary-foreground hover:border-primary/50";