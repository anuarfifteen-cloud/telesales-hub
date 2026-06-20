import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";

const VOUCHER_BG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/download.png";

function generateCode() {
  const chunk = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BV-${chunk()}-${chunk()}`;
}
function randomReward() {
  return Math.floor(Math.random() * 5) + 1;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } catch (_) {}
}

function playRedeemChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
  } catch (_) {}
}

function VoucherCard({ voucher, onCopy, copied }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: "2 / 1" }}>
      <img src={VOUCHER_BG} alt="voucher" className="absolute inset-0 w-full h-full object-cover" />
      {/* Content on the right side */}
      <div className="absolute inset-0 flex flex-col items-end justify-center pr-6 gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Blind Voucher</span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xl text-slate-800 tracking-widest drop-shadow-sm">{voucher.code}</span>
          <button
            onClick={() => onCopy(voucher.code)}
            className="p-1 rounded-full bg-white/80 hover:bg-white transition-colors shadow"
          >
            {copied === voucher.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
          </button>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
          Active
        </span>
      </div>
    </div>
  );
}

// Overlay shown during purchase reveal
function RevealOverlay({ phase, reward, onDone }) {
  // phase: "shake" | "reveal"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <style>{`
        @keyframes giftShake {
          0%,100% { transform: rotate(0deg) scale(1.1); }
          20% { transform: rotate(-12deg) scale(1.15); }
          40% { transform: rotate(12deg) scale(1.2); }
          60% { transform: rotate(-8deg) scale(1.15); }
          80% { transform: rotate(8deg) scale(1.1); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {phase === "shake" && (
        <div className="flex flex-col items-center gap-4">
          <span style={{ fontSize: 90, animation: "giftShake 0.5s ease-in-out infinite" }}>🎁</span>
          <p className="text-white font-bold text-lg tracking-wide">Opening your voucher…</p>
        </div>
      )}

      {phase === "reveal" && (
        <div
          className="bg-white dark:bg-card rounded-3xl p-8 flex flex-col items-center gap-4 mx-6 text-center shadow-2xl"
          style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        >
          <span style={{ fontSize: 60 }}>🎉</span>
          <h2 className="font-black text-2xl text-foreground">You won!</h2>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-3">
            <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-8 h-8" />
            <span className="font-black text-3xl text-amber-600">{reward}</span>
            <span className="font-bold text-lg text-amber-700">token{reward !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-sm text-muted-foreground">Your voucher code is now active below!</p>
          <Button onClick={onDone} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black w-full">
            Awesome! 🎊
          </Button>
        </div>
      )}
    </div>
  );
}

// Overlay shown during redeem reveal
function RedeemOverlay({ phase, reward, onDone }) {
  const confetti = ["🎊", "🎉", "✨", "⭐", "🌟", "💫"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Confetti particles */}
      {phase === "shake" && Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: `${Math.random() * 40}%`,
            left: `${Math.random() * 100}%`,
            fontSize: 28 + Math.random() * 20,
            animation: `confettiFall ${0.8 + Math.random() * 0.8}s ease-in ${Math.random() * 0.5}s infinite`,
          }}
        >
          {confetti[i % confetti.length]}
        </span>
      ))}

      {phase === "shake" && (
        <div className="flex flex-col items-center gap-4 z-10">
          <span style={{ fontSize: 90 }}>🎊</span>
          <p className="text-white font-bold text-lg tracking-wide">Redeeming voucher…</p>
        </div>
      )}

      {phase === "reveal" && (
        <div
          className="bg-white dark:bg-card rounded-3xl p-8 flex flex-col items-center gap-4 mx-6 text-center shadow-2xl z-10"
          style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        >
          <span style={{ fontSize: 60 }}>🎉</span>
          <h2 className="font-black text-2xl text-foreground">Redeemed!</h2>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-3">
            <span className="font-black text-3xl text-emerald-600">+{reward}</span>
            <span className="font-bold text-lg text-emerald-700">token{reward !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-sm text-muted-foreground">Added to your balance!</p>
          <Button onClick={onDone} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black w-full">
            Sweet! 🎊
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BlindVoucherShop({ user, onUserUpdate }) {
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseOverlay, setPurchaseOverlay] = useState(null); // null | { phase, reward }
  const [redeemOverlay, setRedeemOverlay] = useState(null); // null | { phase, reward }
  const [copied, setCopied] = useState(null);
  const [activeVouchers, setActiveVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState(null);

  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= 2;

  const loadActiveVouchers = async () => {
    if (!user?.id) return;
    const vouchers = await base44.entities.Voucher.filter({ user_id: user.id, status: "active" });
    vouchers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setActiveVouchers(vouchers);
    setLoadingVouchers(false);
  };

  useEffect(() => { loadActiveVouchers(); }, [user?.id]);

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;
    setPurchasing(true);
    const code = generateCode();
    const reward = randomReward();

    await base44.auth.updateMe({ earlyAccessTokens: tokens - 2 });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      amount: -2,
      source: "Blind Voucher Purchase",
      timestamp: new Date().toISOString(),
    });
    await base44.entities.Voucher.create({
      user_id: user.id,
      user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
      code,
      reward_tokens: reward,
      status: "active",
      created_at: new Date().toISOString(),
    });

    await onUserUpdate();
    await loadActiveVouchers();
    setPurchasing(false);

    // Start reveal animation
    playChime();
    setPurchaseOverlay({ phase: "shake", reward });
    setTimeout(() => setPurchaseOverlay({ phase: "reveal", reward }), 2000);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim() || redeemLoading) return;
    setRedeemLoading(true);
    setRedeemError(null);

    const results = await base44.entities.Voucher.filter({ code: redeemCode.trim().toUpperCase() });
    const voucher = results[0];

    if (!voucher) { setRedeemError("Invalid code."); setRedeemLoading(false); return; }
    if (voucher.status === "redeemed") { setRedeemError("Code already used."); setRedeemLoading(false); return; }
    if (voucher.user_id !== user.id) { setRedeemError("This code is not yours."); setRedeemLoading(false); return; }

    const reward = voucher.reward_tokens ?? 1;
    const freshUser = await base44.auth.me();
    const currentTokens = freshUser?.earlyAccessTokens ?? 0;

    await Promise.all([
      base44.auth.updateMe({ earlyAccessTokens: currentTokens + reward }),
      base44.entities.Voucher.update(voucher.id, { status: "redeemed" }),
      base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email?.split("@")[0] || "Unknown",
        amount: reward,
        source: `Blind Voucher Redemption (${voucher.code})`,
        timestamp: new Date().toISOString(),
      }),
    ]);

    setRedeemCode("");
    await onUserUpdate();
    await loadActiveVouchers();
    setRedeemLoading(false);

    playRedeemChime();
    setRedeemOverlay({ phase: "shake", reward });
    setTimeout(() => setRedeemOverlay({ phase: "reveal", reward }), 2000);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Overlays */}
      {purchaseOverlay && (
        <RevealOverlay
          phase={purchaseOverlay.phase}
          reward={purchaseOverlay.reward}
          onDone={() => setPurchaseOverlay(null)}
        />
      )}
      {redeemOverlay && (
        <RedeemOverlay
          phase={redeemOverlay.phase}
          reward={redeemOverlay.reward}
          onDone={() => setRedeemOverlay(null)}
        />
      )}

      {/* Purchase Card */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <h3 className="font-black text-base text-foreground">Blind Voucher</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Spend 2 tokens for a mystery voucher worth 1–5 tokens. Redeem below to claim!
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
            2 tokens
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handlePurchase}
            disabled={!canAfford || purchasing}
            className="w-full font-black bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg"
          >
            {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : "🎁 Purchase Mystery Voucher"}
          </Button>
          {!canAfford && (
            <p className="text-xs text-red-500 font-semibold text-center">Not enough tokens (need 2)</p>
          )}
        </div>
      </div>

      {/* My Active Vouchers — shown as gift cards */}
      {!loadingVouchers && activeVouchers.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Active Vouchers</p>
          {activeVouchers.map((v) => (
            <VoucherCard key={v.id} voucher={v} onCopy={handleCopy} copied={copied} />
          ))}
        </div>
      )}

      {/* Redeem Section */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎟️</span>
          <p className="text-sm font-black text-foreground">Redeem a Voucher</p>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">Enter your voucher code to claim your mystery tokens.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setRedeemError(null); }}
            placeholder="BV-XXXX-XXXX"
            className="flex-1 font-mono text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button
            onClick={handleRedeem}
            disabled={!redeemCode.trim() || redeemLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {redeemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
          </Button>
        </div>
        {redeemError && <p className="text-xs text-red-500 font-semibold">{redeemError}</p>}
      </div>
    </div>
  );
}