import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

// ── Chip bundles: chips for tokens (one-way purchase, discounted) ──
const BUNDLES = [
  { id: "red", chips: 10, tokens: 8, color: "#dc2626", accent: "rgba(255,255,255,0.55)", label: "Red" },
  { id: "blue", chips: 50, tokens: 35, color: "#2563eb", accent: "rgba(255,255,255,0.55)", label: "Blue" },
  { id: "black", chips: 100, tokens: 80, color: "#1a1a1a", accent: "#d4af37", label: "Black / Gold", gold: true },
];

// ── Pure-CSS casino chip ──
function ChipIcon({ bundle, size = 56 }) {
  const { color, accent, gold } = bundle;
  return (
    <div
      className="relative rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${gold ? "#2a2a2a" : color}, ${color} 65%)`,
        border: "3px solid #ffffff",
        boxShadow: "0 3px 10px rgba(0,0,0,0.45), inset 0 0 6px rgba(0,0,0,0.35)",
      }}
    >
      {/* outer dashed ring */}
      <div
        className="absolute inset-1 rounded-full border-2 border-dashed"
        style={{ borderColor: accent }}
      />
      {/* concentric ring */}
      <div
        className="absolute inset-[10px] rounded-full border-2"
        style={{ borderColor: gold ? "#d4af37" : "rgba(255,255,255,0.3)" }}
      />
      {/* center emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[13px] font-black leading-none"
          style={{ color: gold ? "#d4af37" : "#ffffff", textShadow: gold ? "0 1px 2px rgba(0,0,0,0.6)" : "none" }}
        >
          ★
        </span>
      </div>
    </div>
  );
}

export default function ChipCashierModal({ user, open, onClose, onUserUpdate }) {
  const [selected, setSelected] = useState(BUNDLES[0].id);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const tokens = Number(user?.earlyAccessTokens) || 0;
  const chips = Number(user?.casinoChips) || 0;

  const bundle = BUNDLES.find((b) => b.id === selected);
  const totalTokens = bundle.tokens * qty;
  const totalChips = bundle.chips * qty;
  const canAfford = tokens >= totalTokens;

  const handleConfirm = async () => {
    if (busy) return;
    if (!canAfford) {
      toast.error("Not enough tokens for that bundle.");
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe({
        earlyAccessTokens: tokens - totalTokens,
        casinoChips: chips + totalChips,
      });
      await onUserUpdate?.();
      toast.success(`Bought ${totalChips} chips for ${totalTokens} tokens!`);
      setQty(1);
      onClose();
    } catch (e) {
      toast.error("Purchase failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-emerald-400/30 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #1a4336 0%, #0f2b22 60%, #0a1d17 100%)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎰</span>
                <h3 className="font-black uppercase tracking-widest text-amber-300 text-sm">
                  Chip Cashier
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-emerald-950/50 border border-emerald-400/20 text-emerald-100/70 hover:text-white transition"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>

            {/* Balance row */}
            <div className="flex items-center justify-center gap-3 px-5 pb-3">
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30">
                <MiniChipIcon size={12} />
                <span className="text-amber-200 font-bold text-xs tabular-nums">{chips} chips</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/40 rounded-full px-3 py-1 border border-amber-400/30">
                <img src={TOKEN_IMG} alt="token" className="w-3 h-3 object-contain" />
                <span className="text-amber-300 font-bold text-xs tabular-nums">{tokens}</span>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 text-center px-5 pb-2">
              Buy chips with tokens — chips bet in Casino 21 only
            </p>

            {/* Bundle selection */}
            <div className="px-5 space-y-2.5">
              {BUNDLES.map((b) => {
                const isActive = selected === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3 border transition-all ${
                      isActive
                        ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                        : "border-emerald-400/20 bg-emerald-950/30 hover:border-emerald-400/40"
                    }`}
                  >
                    <ChipIcon bundle={b} size={52} />
                    <div className="flex-1 text-left">
                      <p className="font-black text-amber-200 text-sm uppercase tracking-wider">
                        {b.chips} Chips
                      </p>
                      <p className="flex items-center gap-1 text-emerald-100/70 text-xs">
                        for <span className="font-bold text-amber-300">{b.tokens}</span>
                        <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain inline" />
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-amber-300 text-xs font-black uppercase tracking-widest">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quantity selector */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 mb-2">Quantity</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQty(q)}
                    className={`py-2.5 rounded-xl font-black text-sm uppercase tracking-widest border transition ${
                      qty === q
                        ? "bg-amber-400 text-emerald-950 border-amber-300"
                        : "bg-emerald-950/40 text-emerald-100/70 border-emerald-400/20 hover:border-emerald-400/40"
                    }`}
                  >
                    ×{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Total + confirm */}
            <div className="px-5 pb-5 pt-3">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-emerald-100/70 uppercase tracking-widest font-bold">Total</span>
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-amber-200 font-black tabular-nums">
                    <MiniChipIcon size={12} />
                    {totalChips}
                  </span>
                  <span className="text-emerald-100/40">for</span>
                  <span className="flex items-center gap-1 text-amber-300 font-black tabular-nums">
                    {totalTokens}
                    <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain" />
                  </span>
                </span>
              </div>
              <button
                onClick={handleConfirm}
                disabled={busy || !canAfford}
                className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 disabled:opacity-40 hover:brightness-105 transition flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Purchase"}
              </button>
              {!canAfford && (
                <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                  Not enough tokens
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}