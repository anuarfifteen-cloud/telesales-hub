import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Lock, Check, Sparkles, Loader2, Palette, Flame } from "lucide-react";
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
    description: "Classic slate & blue.",
    preview: "linear-gradient(135deg, #f5f7fb 0%, #3b82f6 100%)",
  },
  {
    id: "gold",
    name: "Gold",
    description: "Obsidian & metallic gold.",
    preview: "linear-gradient(135deg, #1a1714 0%, #d4af37 100%)",
  },
  {
    id: "pink",
    name: "Pink",
    description: "Blush rose & soft white.",
    preview: "linear-gradient(135deg, #ffd9e6 0%, #ff5a8a 100%)",
  },
  {
    id: "gamer",
    name: "Retro",
    description: "90s PC neubrutalist.",
    preview: "linear-gradient(135deg, #fdf6ee 0%, #00b4d8 40%, #ff85a1 72%, #ffb703 100%)",
  },
];

function useCountdown(targetIso) {
  const [remaining, setRemaining] = useState(() => {
    if (!targetIso) return 0;
    return Math.max(0, new Date(targetIso).getTime() - Date.now());
  });
  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function fmtTime(ms) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ThemeShop({ user, onUserUpdate }) {
  const [busy, setBusy] = useState(null);
  const [shopConfig, setShopConfig] = useState({ price: 30, discount: 0, offerActive: false, offerEnd: null });
  const unlocked = Array.isArray(user?.unlockedThemes) ? user.unlockedThemes : ["default"];
  const active = user?.activeTheme || "default";
  const tokens = user?.earlyAccessTokens ?? 0;

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      if (rows.length > 0) {
        const s = rows[0];
        setShopConfig({
          price: s.theme_shop_price ?? 30,
          discount: s.theme_discount_percent ?? 0,
          offerActive: s.theme_offer_active === true,
          offerEnd: s.theme_offer_end_time || null,
        });
      }
    });
  }, []);

  const remaining = useCountdown(shopConfig.offerActive ? shopConfig.offerEnd : null);
  const countdownStr = fmtTime(remaining);
  const offerLive = shopConfig.offerActive && countdownStr !== null && shopConfig.discount > 0;
  const basePrice = Math.round(shopConfig.price);
  const effectivePrice = offerLive
    ? Math.ceil(basePrice * (1 - shopConfig.discount / 100))
    : basePrice;

  const applyAttr = (id) => applyActiveTheme(id);

  const handlePurchase = async (theme) => {
    if (busy) return;
    if (tokens < effectivePrice) {
      toast.error(`You need ${effectivePrice} tokens to unlock this theme.`);
      return;
    }
    setBusy(theme.id);
    try {
      await base44.auth.updateMe({
        earlyAccessTokens: tokens - effectivePrice,
        unlockedThemes: [...new Set([...unlocked, theme.id])],
        activeTheme: theme.id,
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        amount: -effectivePrice,
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
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">🎨 Theme Shop</p>
      </div>

      {offerLive && (
        <div className="mb-3 rounded-xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Limited-Time Offer · {shopConfig.discount}% OFF
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-wider">
              {countdownStr}
            </span>
            <span className="text-[10px] font-semibold text-rose-500/80 uppercase tracking-wide">
              left to grab it
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const owned = unlocked.includes(theme.id);
          const isActive = active === theme.id;
          const isBusy = busy === theme.id;
          const canAfford = tokens >= effectivePrice;
          const isFree = theme.id === "default";
          const displayPrice = isFree ? 0 : effectivePrice;
          const showOriginalStr = offerLive && !isFree && !owned && basePrice !== effectivePrice;
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
              {offerLive && !isFree && !owned && (
                <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                  -{shopConfig.discount}%
                </span>
              )}
              <div className="h-16 w-full" style={{ background: theme.preview }} />
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-foreground">{theme.name}</span>
                  {isFree ? (
                    <span className="text-[10px] font-bold text-muted-foreground">Free</span>
                  ) : (
                    <span className="inline-flex items-baseline gap-1">
                      {showOriginalStr && (
                        <span className="text-[10px] font-bold text-muted-foreground line-through">🪙 {basePrice}</span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        🪙 {displayPrice}
                      </span>
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
                  disabled={isBusy || isActive || (!owned && displayPrice > 0 && !canAfford)}
                  className={`mt-2 w-full text-xs font-bold rounded-lg py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-muted text-muted-foreground cursor-default"
                      : owned
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : canAfford
                      ? offerLive
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isActive ? (
                    <><Check className="w-3 h-3" /> Equipped</>
                  ) : owned ? (
                    <><Sparkles className="w-3 h-3" /> Equip</>
                  ) : isFree ? (
                    "Unlock"
                  ) : canAfford ? (
                    <><Lock className="w-3 h-3" /> Buy</>
                  ) : (
                    <><Lock className="w-3 h-3" /> {displayPrice} 🪙</>
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