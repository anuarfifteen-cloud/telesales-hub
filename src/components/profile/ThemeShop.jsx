import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Lock, Check, Sparkles, Loader2, Palette } from "lucide-react";
import { applyActiveTheme } from "@/lib/theme";

const THEME_BADGES = {
  gold: "Dark",
  pink: "Light",
  gamer: "Dark",
};

const THEMES = [
  {
    id: "default",
    name: "Default",
    price: 0,
    description: "Classic slate & blue.",
    preview: "linear-gradient(135deg, #f5f7fb 0%, #3b82f6 100%)",
  },
  {
    id: "gold",
    name: "Gold",
    price: 30,
    description: "Obsidian & metallic gold.",
    preview: "linear-gradient(135deg, #1a1714 0%, #d4af37 100%)",
  },
  {
    id: "pink",
    name: "Pink",
    price: 30,
    description: "Blush rose & soft white.",
    preview: "linear-gradient(135deg, #ffd9e6 0%, #ff5a8a 100%)",
  },
  {
    id: "gamer",
    name: "Gamer",
    price: 30,
    description: "Pitch black & neon glow.",
    preview: "linear-gradient(135deg, #050505 0%, #00f3ff 50%, #ff00ea 100%)",
  },
];

export default function ThemeShop({ user, onUserUpdate }) {
  const [busy, setBusy] = useState(null);
  const unlocked = Array.isArray(user?.unlockedThemes) ? user.unlockedThemes : ["default"];
  const active = user?.activeTheme || "default";
  const tokens = user?.earlyAccessTokens ?? 0;

  const applyAttr = (id) => applyActiveTheme(id);

  const handlePurchase = async (theme) => {
    if (busy) return;
    if (tokens < 30) {
      toast.error("You need 30 tokens to unlock this theme.");
      return;
    }
    setBusy(theme.id);
    try {
      await base44.auth.updateMe({
        earlyAccessTokens: tokens - 30,
        unlockedThemes: [...new Set([...unlocked, theme.id])],
        activeTheme: theme.id,
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        amount: -30,
        source: `Theme Purchase: ${theme.name}`,
        timestamp: new Date().toISOString(),
      });
      applyAttr(theme.id);
      await onUserUpdate?.();
      toast.success(`${theme.name} theme unlocked & equipped!`);
    } catch (e) {
      toast.error("Purchase failed: " + (e?.message || "Unknown error"));
    }
    setBusy(null);
  };

  const handleEquip = async (theme) => {
    if (busy) return;
    setBusy(theme.id);
    try {
      await base44.auth.updateMe({ activeTheme: theme.id });
      applyAttr(theme.id);
      await onUserUpdate?.();
      toast.success(`${theme.name} theme equipped.`);
    } catch (e) {
      toast.error("Failed to equip theme.");
    }
    setBusy(null);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">🎨 Theme Shop</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const owned = unlocked.includes(theme.id);
          const isActive = active === theme.id;
          const isBusy = busy === theme.id;
          const canAfford = tokens >= 30;
          return (
            <div
              key={theme.id}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                isActive ? "border-primary shadow-md" : "border-border"
              }`}
            >
              {isActive && (
                <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" /> Active
                </span>
              )}
              <div className="h-16 w-full" style={{ background: theme.preview }} />
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-foreground">{theme.name}</span>
                  {theme.price === 0 ? (
                    <span className="text-[10px] font-bold text-muted-foreground">Free</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      🪙 {theme.price}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{theme.description}</p>
                {THEME_BADGES[theme.id] && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground mt-1">
                    🔒 {THEME_BADGES[theme.id]} Mode
                  </span>
                )}
                <button
                  onClick={() => (owned ? handleEquip(theme) : handlePurchase(theme))}
                  disabled={isBusy || isActive || (!owned && theme.price > 0 && !canAfford)}
                  className={`mt-2 w-full text-xs font-bold rounded-lg py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-muted text-muted-foreground cursor-default"
                      : owned
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : canAfford
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isActive ? (
                    <><Check className="w-3 h-3" /> Equipped</>
                  ) : owned ? (
                    <><Sparkles className="w-3 h-3" /> Equip</>
                  ) : theme.price === 0 ? (
                    "Unlock"
                  ) : canAfford ? (
                    <><Lock className="w-3 h-3" /> Buy</>
                  ) : (
                    <><Lock className="w-3 h-3" /> 30 🪙</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}