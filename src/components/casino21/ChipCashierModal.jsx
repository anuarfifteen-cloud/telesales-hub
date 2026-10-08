import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import MiniChipIcon from "./MiniChipIcon";
import HowToPlayButton from "./HowToPlayButton";
import { logChipMovement } from "@/lib/chipLog";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";
// Buying chips stays at 1 token = 10 chips.
const CHIPS_PER_TOKEN = 10;
// Cashing out is steeper — 20 chips = 1 token (a 50% service fee on the way out) —
// and only ever moves whole 20-chip blocks, so a payout is always whole tokens.
const CASHOUT_CHIPS_PER_TOKEN = 20;
// Fallback ceilings, used when an admin hasn't saved a value in AppSettings
// (Admin Dashboard → Casino Economy → Cashier Limits).
const DAILY_CASHOUT_LIMIT = 5000;
const MONTHLY_CONVERSION_CAP = 1000000;

// Brunei-calendar YYYY-MM-DD for "today" — used to match cash-out logs.
function getBruneiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
}

// Brunei-calendar YYYY-MM for "this month" — used to total chip conversions.
function getBruneiMonth() {
  return getBruneiToday().slice(0, 7);
}

// ── Chip bundles: chips for tokens ──
// Standard rate is 1 token = 10 chips; the two larger tiers pay bonus chips.
const BUNDLES = [
  { id: "red", chips: 10, tokens: 1, color: "#dc2626", accent: "rgba(255,255,255,0.55)", label: "Red" },
  { id: "blue", chips: 110, tokens: 10, bonus: 10, color: "#2563eb", accent: "rgba(255,255,255,0.55)", label: "Blue" },
  { id: "black", chips: 525, tokens: 50, bonus: 25, color: "#1a1a1a", accent: "#d4af37", label: "Black / Gold", gold: true },
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
      <div
        className="absolute inset-1 rounded-full border-2 border-dashed"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute inset-[10px] rounded-full border-2"
        style={{ borderColor: gold ? "#d4af37" : "rgba(255,255,255,0.3)" }}
      />
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

export default function ChipCashierModal({ user, open, onClose, onUserUpdate, onOpenGuide }) {
  const [mode, setMode] = useState("buy"); // buy | cashout
  const [buyTokens, setBuyTokens] = useState(BUNDLES[0].tokens);
  const [cashAmount, setCashAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  // Admin-set ceilings, refreshed each time the Cashier opens.
  const [monthlyCap, setMonthlyCap] = useState(MONTHLY_CONVERSION_CAP);
  const [dailyCap, setDailyCap] = useState(DAILY_CASHOUT_LIMIT);

  const tokens = Number(user?.earlyAccessTokens) || 0;
  const chips = Number(user?.casinoChips) || 0;
  const userName = user?.full_name || user?.email?.split("@")[0] || "Player";

  // The typed token amount drives the purchase: an exact bundle amount pays that
  // bundle's bonus chips, any other amount pays the standard 1 token = 10 chips.
  const totalTokens = Math.max(0, Math.floor(Number(buyTokens) || 0));
  const matchedBundle = BUNDLES.find((b) => b.tokens === totalTokens);
  const totalChips = matchedBundle ? matchedBundle.chips : totalTokens * CHIPS_PER_TOKEN;
  const bonusChips = matchedBundle?.bonus || 0;
  const canAfford = tokens >= totalTokens;

  // Daily cash-out cap (Brunei day) — sum chips already converted today from logs.
  const remaining = Math.max(0, dailyCap - usedToday);
  // Largest whole 20-chip block the player may convert right now.
  const cashMax = Math.floor(Math.min(chips, remaining) / CASHOUT_CHIPS_PER_TOKEN) * CASHOUT_CHIPS_PER_TOKEN;

  // Monthly conversion tracker (Brunei calendar month): tokens spent buying chips.
  const monthRemaining = Math.max(0, monthlyCap - usedThisMonth);
  const monthLimitReached = usedThisMonth >= monthlyCap;
  const exceedsMonthRemaining = totalTokens > monthRemaining;

  const refreshUsedToday = async () => {
    if (!user?.id) return;
    try {
      const rows = await base44.entities.CasinoChipLog.filter(
        { user_id: user.id, action_type: "cashier_cashout" },
        "-timestamp",
        50
      );
      const today = getBruneiToday();
      const sum = (rows || []).reduce((acc, r) => {
        const d = r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }) : "";
        return d === today ? acc + Math.abs(Number(r.amount) || 0) : acc;
      }, 0);
      setUsedToday(sum);
    } catch (e) {
      // Non-fatal: allow cash-out, just without the tracker.
    }
  };

  // Total this Brunei month's chip purchases from the player's own buy logs.
  // Entries written before tokens_spent existed read as 0, so they never block.
  const refreshMonthlyUsage = async () => {
    if (!user?.id) return;
    try {
      const rows = await base44.entities.CasinoChipLog.filter(
        { user_id: user.id, action_type: "cashier_buy" },
        "-timestamp",
        200
      );
      const month = getBruneiMonth();
      const sum = (rows || []).reduce((acc, r) => {
        const d = r.timestamp
          ? new Date(r.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }).slice(0, 7)
          : "";
        return d === month ? acc + Math.max(0, Number(r.tokens_spent) || 0) : acc;
      }, 0);
      setUsedThisMonth(sum);
    } catch (e) {
      // Non-fatal: allow purchases, just without the monthly tracker.
    }
  };

  useEffect(() => {
    if (open) {
      refreshUsedToday();
      refreshMonthlyUsage();
      // Re-read the admin-set ceilings on every open so a change applies
      // immediately; unset values fall back to the constants above.
      base44.entities.AppSettings
        .list()
        .then((rows) => {
          const s = rows[0];
          if (Number(s?.monthly_conversion_cap) > 0) setMonthlyCap(Number(s.monthly_conversion_cap));
          if (Number(s?.daily_cashout_cap) > 0) setDailyCap(Number(s.daily_cashout_cap));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // Cash-out amounts, capped by the daily limit. Only whole blocks of 20 chips
  // convert, so the payout is exactly 1 token per 20 chips.
  const cashChips = Math.min(Math.max(Math.floor(cashAmount), 0), cashMax);
  const chipsUsed = Math.floor(cashChips / CASHOUT_CHIPS_PER_TOKEN) * CASHOUT_CHIPS_PER_TOKEN;
  const receive = chipsUsed / CASHOUT_CHIPS_PER_TOKEN;
  const limitReached = remaining <= 0;
  const canCashOut = chipsUsed >= CASHOUT_CHIPS_PER_TOKEN && !limitReached;

  const handleBuy = async () => {
    if (busy) return;
    if (!canAfford) {
      toast.error("Not enough tokens.");
      return;
    }
    if (monthLimitReached) {
      toast.error("Monthly chip conversion limit reached — resets next month.");
      return;
    }
    if (exceedsMonthRemaining) {
      toast.error(`Only ${monthRemaining.toLocaleString()} tokens left in this month's chip allowance.`);
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe({
        earlyAccessTokens: tokens - totalTokens,
        casinoChips: chips + totalChips,
      });
      await onUserUpdate?.();
      logChipMovement({ user, action_type: "cashier_buy", amount: totalChips, tokens_spent: totalTokens, balance_after: chips + totalChips, detail: `Cashier buy ${totalChips} chips for ${totalTokens} tokens` });
      toast.success(`Bought ${totalChips} chips for ${totalTokens} tokens!`);
      setUsedThisMonth((v) => v + totalTokens);
      setBuyTokens(BUNDLES[0].tokens);
      onClose();
    } catch (e) {
      toast.error("Purchase failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCashOut = async () => {
    if (busy) return;
    if (!canCashOut) {
      toast.error(`Enter at least ${CASHOUT_CHIPS_PER_TOKEN} chips to cash out.`);
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe({
        casinoChips: chips - chipsUsed,
        earlyAccessTokens: tokens + receive,
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: userName,
        amount: receive,
        source: `Blackjack 21 — Cash Out (${chipsUsed} chips → ${receive} tokens, 20 chips = 1 token)`,
        timestamp: new Date().toISOString(),
      });
      await onUserUpdate?.();
      logChipMovement({ user, action_type: "cashier_cashout", amount: -chipsUsed, balance_after: chips - chipsUsed, detail: `Cash out ${chipsUsed} chips → ${receive} tokens, 20 chips = 1 token` });
      toast.success(`Cashed out ${chipsUsed} chips for ${receive} tokens.`);
      setCashAmount(0);
      await refreshUsedToday();
      onClose();
    } catch (e) {
      toast.error("Cash out failed. Please try again.");
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
          <div
            className="flex w-full max-w-sm max-h-full flex-col items-center gap-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="cashier-panel w-full rounded-3xl border border-emerald-400/30 overflow-hidden"
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
                  Blackjack 21 · Cashier
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-emerald-950/50 border border-emerald-400/20 text-emerald-100/70 hover:text-white transition"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>

            {/* Rules & rewards entry */}
            {onOpenGuide && (
              <div className="px-5 pb-3">
                <HowToPlayButton size="md" onClick={onOpenGuide} className="w-full" />
              </div>
            )}

            {/* Mode toggle */}
            <div className="px-5 pb-3">
              <div className="grid grid-cols-2 gap-2 p-1 bg-emerald-950/40 rounded-2xl border border-emerald-400/20">
                <button
                  onClick={() => setMode("buy")}
                  className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition ${
                    mode === "buy"
                      ? "bg-amber-400 text-emerald-950"
                      : "text-emerald-100/70 hover:text-emerald-100"
                  }`}
                >
                  Buy Chips
                </button>
                <button
                  onClick={() => setMode("cashout")}
                  className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition ${
                    mode === "cashout"
                      ? "bg-amber-400 text-emerald-950"
                      : "text-emerald-100/70 hover:text-emerald-100"
                  }`}
                >
                  Cash Out
                </button>
              </div>
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

            {mode === "buy" && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 text-center px-5 pb-2">
                  Buy chips with tokens — chips bet in Blackjack 21 only
                </p>

                {/* Monthly conversion tracker */}
                <div className="mx-5 mb-3 rounded-2xl px-4 py-2.5 bg-emerald-950/40 border border-cyan-400/20 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/80">
                    Monthly Limit
                  </span>
                  <span className="flex items-center gap-1 text-xs font-black tabular-nums">
                    <span className="text-amber-200">{usedThisMonth.toLocaleString()}</span>
                    <span className="text-emerald-100/40">/ {monthlyCap.toLocaleString()}</span>
                    <MiniChipIcon size={12} />
                  </span>
                </div>

                {/* Bundle selection — tapping a card fills the token field */}
                <div className="px-5 space-y-2.5">
                  {BUNDLES.map((b) => {
                    const isActive = totalTokens === b.tokens;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setBuyTokens(b.tokens)}
                        className={`cashier-bundle relative w-full flex items-center gap-3 rounded-2xl p-3 border transition-all text-amber-200 ${
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
                        {b.bonus ? (
                          <span className="cashier-bonus absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow">
                            +{b.bonus} Bonus
                          </span>
                        ) : null}
                        {isActive && (
                          <span className="text-amber-300 text-xs font-black uppercase tracking-widest">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom token amount — chips follow at 10 per token */}
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 mb-2">
                    Tokens to spend
                  </p>
                  <div className="flex items-center gap-2">
                    <img src={TOKEN_IMG} alt="token" className="w-5 h-5 object-contain flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={buyTokens}
                      onChange={(e) => setBuyTokens(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl px-3 py-2.5 bg-emerald-950/40 border border-emerald-400/20 text-amber-200 font-black text-sm tabular-nums focus:border-amber-400 focus:outline-none"
                    />
                    <span className="flex items-center gap-1 rounded-xl px-3 py-2.5 bg-emerald-950/40 border border-amber-400/30 text-amber-200 font-black text-sm tabular-nums whitespace-nowrap">
                      = {totalChips}
                      <MiniChipIcon size={12} />
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/50 mt-2">
                    {bonusChips > 0 ? `Bundle bonus applied — +${bonusChips} extra chips` : "1 token = 10 chips"}
                  </p>
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
                    onClick={handleBuy}
                    disabled={busy || !canAfford || monthLimitReached}
                    className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 disabled:opacity-40 hover:brightness-105 transition flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Purchase"}
                  </button>
                  {monthLimitReached ? (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      Monthly limit reached — resets next month
                    </p>
                  ) : exceedsMonthRemaining ? (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      Only {monthRemaining.toLocaleString()} tokens left this month
                    </p>
                  ) : null}
                  {!canAfford && (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      Not enough tokens
                    </p>
                  )}
                </div>
              </>
            )}

            {mode === "cashout" && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/60 text-center px-5 pb-3">
                  Convert chips to tokens · 20 chips = 1 token
                </p>

                {/* Daily limit tracker */}
                <div className="mx-5 mb-3 rounded-2xl px-4 py-2.5 bg-emerald-950/40 border border-cyan-400/20 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/80">
                    Daily Limit
                  </span>
                  <span className="flex items-center gap-1 text-xs font-black tabular-nums">
                    <span className="text-amber-200">{usedToday.toLocaleString()}</span>
                    <span className="text-emerald-100/40">/ {dailyCap.toLocaleString()}</span>
                    <MiniChipIcon size={12} />
                  </span>
                </div>

                {/* Amount slider */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setCashAmount((a) => Math.max(a - CASHOUT_CHIPS_PER_TOKEN, 0))}
                      disabled={chips < CASHOUT_CHIPS_PER_TOKEN || limitReached}
                      className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
                    >
                      ‹
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(cashMax, CASHOUT_CHIPS_PER_TOKEN)}
                      step={CASHOUT_CHIPS_PER_TOKEN}
                      value={Math.min(cashAmount, cashMax)}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      disabled={chips < CASHOUT_CHIPS_PER_TOKEN || limitReached}
                      className="flex-1 accent-cyan-400"
                    />
                    <button
                      onClick={() => setCashAmount((a) => Math.min(a + CASHOUT_CHIPS_PER_TOKEN, cashMax))}
                      disabled={chips < CASHOUT_CHIPS_PER_TOKEN || limitReached}
                      className="w-9 h-9 rounded-full bg-emerald-950/40 border border-cyan-400/30 text-cyan-200 font-black disabled:opacity-30"
                    >
                      ›
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-amber-200 font-black text-sm tabular-nums">
                      <MiniChipIcon size={14} />
                      {chipsUsed} CHIPS
                    </span>
                    <button
                      onClick={() => setCashAmount(cashMax)}
                      disabled={chips < CASHOUT_CHIPS_PER_TOKEN || limitReached}
                      className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-950 disabled:opacity-30"
                      style={{ background: "#d4af37" }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="px-5 space-y-2 pb-3">
                  <div className="flex items-center justify-between rounded-2xl px-4 py-2.5 bg-cyan-950/30 border border-cyan-400/20">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200/80">
                      Conversion rate
                    </span>
                    <span className="flex items-center gap-1 text-cyan-200 font-black text-sm tabular-nums">
                      {CASHOUT_CHIPS_PER_TOKEN} <MiniChipIcon size={12} /> = 1
                      <img src={TOKEN_IMG} alt="" className="w-3 h-3 object-contain" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl px-4 py-2.5 bg-amber-400/10 border border-amber-400/40">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
                      You receive
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-black text-base tabular-nums">
                      +{receive}
                      <img src={TOKEN_IMG} alt="" className="w-3.5 h-3.5 object-contain" />
                    </span>
                  </div>
                </div>

                {/* Confirm */}
                <div className="px-5 pb-5">
                  <button
                    onClick={handleCashOut}
                    disabled={busy || !canCashOut}
                    className="w-full py-3 rounded-full font-black uppercase tracking-widest text-sm bg-amber-400 text-emerald-950 border border-amber-300 disabled:opacity-40 hover:brightness-105 transition flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Cash Out ${receive} Tokens`}
                  </button>
                  {!canCashOut && chips >= CASHOUT_CHIPS_PER_TOKEN && (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      Choose at least {CASHOUT_CHIPS_PER_TOKEN} chips
                    </p>
                  )}
                  {chips < CASHOUT_CHIPS_PER_TOKEN && (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      You need at least {CASHOUT_CHIPS_PER_TOKEN} chips to cash out
                    </p>
                  )}
                  {limitReached && chips >= CASHOUT_CHIPS_PER_TOKEN && (
                    <p className="text-center text-[10px] text-rose-300/80 mt-2 font-bold uppercase tracking-widest">
                      Daily limit reached — come back tomorrow
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>

            {/* Skip option, sitting below the modal container */}
            <button
              onClick={onClose}
              className="w-full shrink-0 py-3 rounded-full font-black uppercase tracking-widest text-sm text-emerald-100/80 bg-emerald-950/60 border border-emerald-400/30 hover:text-white hover:border-emerald-400/60 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}