// Shared navy-and-gold surface styling for the Workspace tab.
// Literal class strings only, so Tailwind keeps every one of them.

export const CARD =
  "rounded-3xl border border-[#d4af37]/25 bg-[#0b1436] p-4 shadow-[0_14px_34px_-22px_rgba(0,0,0,0.95)]";

export const LABEL = "mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#e9cf8f]/70";

export const INPUT =
  "w-full rounded-xl border border-[#d4af37]/30 bg-[#060d26] px-3 py-2.5 text-sm font-medium text-[#f7f1df] placeholder:text-[#f7f1df]/35 focus:border-[#f0d27a] focus:outline-none";

export const PREVIEW =
  "max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[#d4af37]/20 bg-[#060d26] p-3 font-mono text-[11.5px] leading-relaxed text-[#f4ecd8]";

export const GOLD_BG = {
  background: "linear-gradient(180deg,#f7e3a6 0%,#e3c46a 45%,#c9a53c 100%)",
};

export const GOLD_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#20180a] transition hover:brightness-105 active:scale-[0.99]";