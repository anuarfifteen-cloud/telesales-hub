import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Gem } from "lucide-react";
import { formatCountdown } from "@/lib/countdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { toast } from "sonner";

const MILESTONES = [
{ target: 15, tokens: 3, emoji: "👑", label: "15 Bookings — Earn 3 Tokens", doneColor: "emerald", activeBg: "bg-emerald-50 dark:bg-emerald-950/30", activeBorder: "border-emerald-200 dark:border-emerald-800", barColor: "bg-emerald-500", textColor: "text-emerald-800 dark:text-emerald-300", subColor: "text-emerald-600 dark:text-emerald-400", badgeBg: "bg-emerald-100 dark:bg-emerald-900/40", badgeText: "text-emerald-700 dark:text-emerald-300", badgeBorder: "border-emerald-200 dark:border-emerald-700" },
{ target: 30, tokens: 5, emoji: "🌟", label: "30 Bookings — Earn 5 Tokens", doneColor: "amber", activeBg: "bg-amber-50 dark:bg-amber-950/30", activeBorder: "border-amber-200 dark:border-amber-800", barColor: "bg-amber-500", textColor: "text-amber-800 dark:text-amber-300", subColor: "text-amber-600 dark:text-amber-400", badgeBg: "bg-amber-100 dark:bg-amber-900/40", badgeText: "text-amber-700 dark:text-amber-300", badgeBorder: "border-amber-200 dark:border-amber-700" },
{ target: 50, tokens: 10, emoji: "💎", label: "50 Bookings — Earn 10 Tokens", doneColor: "blue", activeBg: "bg-blue-50 dark:bg-blue-950/30", activeBorder: "border-blue-200 dark:border-blue-800", barColor: "bg-blue-500", textColor: "text-blue-800 dark:text-blue-300", subColor: "text-blue-600 dark:text-blue-400", badgeBg: "bg-blue-100 dark:bg-blue-900/40", badgeText: "text-blue-700 dark:text-blue-300", badgeBorder: "border-blue-200 dark:border-blue-700" },
{ target: 100, tokens: 20, emoji: "🚀", label: "100 Bookings — Earn 20 Tokens", doneColor: "purple", activeBg: "bg-purple-50 dark:bg-purple-950/30", activeBorder: "border-purple-200 dark:border-purple-800", barColor: "bg-purple-500", textColor: "text-purple-800 dark:text-purple-300", subColor: "text-purple-600 dark:text-purple-400", badgeBg: "bg-purple-100 dark:bg-purple-900/40", badgeText: "text-purple-700 dark:text-purple-300", badgeBorder: "border-purple-200 dark:border-purple-700" },
{ target: 250, tokens: 25, diamonds: 1, emoji: "💠", label: "250 Bookings — Earn 1💎 + 25 Tokens", doneColor: "cyan", activeBg: "bg-cyan-50 dark:bg-cyan-950/30", activeBorder: "border-cyan-200 dark:border-cyan-800", barColor: "bg-cyan-500", textColor: "text-cyan-800 dark:text-cyan-300", subColor: "text-cyan-600 dark:text-cyan-400", badgeBg: "bg-cyan-100 dark:bg-cyan-900/40", badgeText: "text-cyan-700 dark:text-cyan-300", badgeBorder: "border-cyan-200 dark:border-cyan-700" },
{ target: 500, tokens: 30, diamonds: 3, emoji: "🔷", label: "500 Bookings — Earn 3💎 + 30 Tokens", doneColor: "rose", activeBg: "bg-rose-50 dark:bg-rose-950/30", activeBorder: "border-rose-200 dark:border-rose-800", barColor: "bg-rose-500", textColor: "text-rose-800 dark:text-rose-300", subColor: "text-rose-600 dark:text-rose-400", badgeBg: "bg-rose-100 dark:bg-rose-900/40", badgeText: "text-rose-700 dark:text-rose-300", badgeBorder: "border-rose-200 dark:border-rose-700" },
{ target: 1000, tokens: 50, diamonds: 5, emoji: "🏆", label: "1000 Bookings — Earn 5💎 + 50 Tokens", doneColor: "yellow", activeBg: "bg-yellow-50 dark:bg-yellow-950/30", activeBorder: "border-yellow-200 dark:border-yellow-800", barColor: "bg-yellow-500", textColor: "text-yellow-800 dark:text-yellow-300", subColor: "text-yellow-600 dark:text-yellow-400", badgeBg: "bg-yellow-100 dark:bg-yellow-900/40", badgeText: "text-yellow-700 dark:text-yellow-300", badgeBorder: "border-yellow-200 dark:border-yellow-700" }];


function MilestoneRow({ milestone, totalBookingCount, index }) {
  const done = totalBookingCount >= milestone.target;
  const isNext = !done && (index === 0 || totalBookingCount >= MILESTONES[index - 1].target);
  const pct = done ? 100 : Math.round(Math.min(totalBookingCount, milestone.target) / milestone.target * 100);

  const [showAnim, setShowAnim] = useState(false);
  const wasUnlocked = useRef(done);

  useEffect(() => {
    if (done && !wasUnlocked.current) {
      setShowAnim(true);
      wasUnlocked.current = true;
      setTimeout(() => setShowAnim(false), 2500);
    }
  }, [done]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative rounded-xl px-3 py-2.5 border overflow-hidden ${
      done ?
      `${milestone.activeBg} ${milestone.activeBorder}` :
      "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"}`
      }>
      
      <AnimatePresence>
        {showAnim &&
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.6 }}
          exit={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          
            <span className="text-4xl">✨</span>
          </motion.div>
        }
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <span className={`text-lg flex-shrink-0 ${done ? "" : "grayscale opacity-40"}`}>{milestone.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${done ? milestone.textColor : "text-slate-500 dark:text-slate-400"}`}>
            {milestone.label}
          </p>

          <div className="mt-1.5 mb-0.5 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${done ? milestone.barColor : isNext ? milestone.barColor + " opacity-70" : "bg-slate-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }} />
            
          </div>

          {done ?
          <p className={`text-[10px] font-medium ${milestone.subColor}`}>✓ Milestone reached</p> :

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {Math.min(totalBookingCount, milestone.target)}/{milestone.target} bookings
              {isNext && <span className="ml-1 text-amber-500 font-semibold">← next!</span>}
            </p>
          }
        </div>

        {done ?
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${milestone.badgeBg} ${milestone.badgeText} ${milestone.badgeBorder}`}>
            DONE
          </span> :

        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 flex-shrink-0">
            LOCKED
          </span>
        }
      </div>
    </motion.div>);

}

const VIP_PLUS_PRICE = 5;

export default function EarlyAccessToggle({ user, onUserUpdate, totalBookingCount = 0, showMilestones = true }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPlusConfirm, setShowPlusConfirm] = useState(false);
  const [showPriorityConfirm, setShowPriorityConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPlus, setSavingPlus] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [vipPrice, setVipPrice] = useState(1);
  const [, setTick] = useState(0);

  // Re-render every 30s so the priority pass countdown stays live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    base44.entities.AppSettings.list().then((rows) => {
      if (rows.length > 0 && rows[0].vip_pass_price != null) {
        setVipPrice(rows[0].vip_pass_price);
      }
    });
  }, []);

  const tokens = user?.earlyAccessTokens ?? 0;

  // 30-min pass
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const isVipActive = vipExpiresAt && vipExpiresAt.getTime() > Date.now();
  const canActivate = tokens >= vipPrice && !isVipActive;

  // 1-hour pass
  const vipPlusExpiresAt = user?.vipPlusExpiresAt ? new Date(user.vipPlusExpiresAt) : null;
  const isVipPlusActive = vipPlusExpiresAt && vipPlusExpiresAt.getTime() > Date.now();
  const canActivatePlus = tokens >= VIP_PLUS_PRICE && !isVipPlusActive;

  // 7-day priority pass
  const diamonds = user?.diamonds ?? 0;
  const priorityExpiresAt = user?.active_pass_expiry ? new Date(user.active_pass_expiry) : null;
  const isPriorityActive = priorityExpiresAt && priorityExpiresAt.getTime() > Date.now();
  const canActivatePriority = diamonds > 0 && !isPriorityActive;

  const nextMilestone = MILESTONES.find((m) => totalBookingCount < m.target);
  const overallPct = nextMilestone ? Math.round(totalBookingCount / nextMilestone.target * 100) : 100;

  const handleActivate = async () => {
    setSaving(true);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.auth.updateMe({ earlyAccessTokens: tokens - vipPrice, vipExpiresAt: expiresAt });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      amount: -vipPrice,
      source: "VIP Pass Purchase (30-min early)",
      timestamp: new Date().toISOString()
    });
    await onUserUpdate();
    setSaving(false);
    setShowConfirm(false);
    toast.success("⚡ Early Access activated! You can now book 30 minutes early.");
  };

  const handleActivatePlus = async () => {
    setSavingPlus(true);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.auth.updateMe({ earlyAccessTokens: tokens - VIP_PLUS_PRICE, vipPlusExpiresAt: expiresAt });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      amount: -VIP_PLUS_PRICE,
      source: "VIP Plus Pass Purchase (1-hour early)",
      timestamp: new Date().toISOString()
    });
    await onUserUpdate();
    setSavingPlus(false);
    setShowPlusConfirm(false);
    toast.success("🚀 VIP Plus activated! You can now book 1 hour early.");
  };

  const handleActivatePriority = async () => {
    setSavingPriority(true);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await base44.auth.updateMe({ diamonds: diamonds - 1, active_pass_expiry: expiresAt });
    await onUserUpdate();
    setSavingPriority(false);
    setShowPriorityConfirm(false);
    toast.success("💎 7-Day Priority Access activated!");
  };

  const formatExpiry = (date) => {
    if (!date) return "";
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  return (
    <>
      {/* ── Milestones ── */}
      {showMilestones &&
      <div className="space-y-3">
          {nextMilestone &&
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Next Milestone
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {totalBookingCount} / {nextMilestone.target} bookings
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }} />
            
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {nextMilestone.target - totalBookingCount} more booking{nextMilestone.target - totalBookingCount !== 1 ? "s" : ""} to earn {nextMilestone.tokens} tokens {nextMilestone.emoji}
              </p>
            </div>
        }
          {MILESTONES.map((m, i) =>
        <MilestoneRow key={m.target} milestone={m} totalBookingCount={totalBookingCount} index={i} />
        )}
        </div>
      }

      {/* ── VIP Pass / Spend Tokens ── */}
      {!showMilestones &&
      <div className="space-y-3">
          {/* ── 30-min pass ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className={`w-4 h-4 flex-shrink-0 ${isVipActive ? "text-amber-500" : tokens >= vipPrice ? "text-blue-500" : "text-slate-300 dark:text-slate-600"}`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${isVipActive || tokens >= vipPrice ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
  ACTIVATE EARLY 30-MINS BOOKING ACCESS
</p>
                {isVipActive ?
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-none mt-0.5 font-semibold">
                    ⚡ Active — expires {formatExpiry(vipExpiresAt)}
                  </p> :

              <p className={`text-[10px] leading-none mt-0.5 font-semibold ${tokens >= vipPrice ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {vipPrice} token{vipPrice !== 1 ? "s" : ""} — book 30 min early.
                  </p>
              }
              </div>
            </div>
            <button
            disabled={!canActivate || saving}
            onClick={() => setShowConfirm(true)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
                ${isVipActive ? "bg-amber-500" : canActivate ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-40"}`}>
            
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isVipActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* ── 1-hour pass ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className={`w-4 h-4 flex-shrink-0 ${isVipPlusActive ? "text-purple-500" : tokens >= VIP_PLUS_PRICE ? "text-purple-400" : "text-slate-300 dark:text-slate-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-nowrap max-w-full">
                  <p className={`text-sm font-medium ${isVipPlusActive || tokens >= VIP_PLUS_PRICE ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
  ACTIVATE EARLY 1-HRS BOOKING ACCESS
</p>
                </div>

                {isVipPlusActive ?
              <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-none mt-1 font-semibold">
                    🚀 Active — expires {formatExpiry(vipPlusExpiresAt)}
                  </p> :

              <p className={`text-[10px] leading-none mt-1 font-semibold ${tokens >= VIP_PLUS_PRICE ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {VIP_PLUS_PRICE} tokens — book 1 hour early.
                  </p>
              }
              </div>
            </div>

            <button
            disabled={!canActivatePlus || savingPlus}
            onClick={() => setShowPlusConfirm(true)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
                ${isVipPlusActive ? "bg-purple-500" : canActivatePlus ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-40"}`}>
            
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isVipPlusActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* ── 7-Day Priority Access ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Gem className={`w-4 h-4 flex-shrink-0 ${isPriorityActive ? "text-purple-500" : diamonds > 0 ? "text-purple-400" : "text-slate-300 dark:text-slate-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`text-sm font-medium ${isPriorityActive || diamonds > 0 ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>
                    ACTIVATE 7-DAY PRIORITY ACCESS
                  <span className="text-[9px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 mx-2 my-1">NEW

                  </span>
                  </p>
                </div>
                {isPriorityActive ?
              <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-none mt-1 font-semibold">
                    💎 Active — {formatCountdown(priorityExpiresAt)} left
                  </p> :

              <p className={`text-[10px] leading-none mt-1 font-semibold ${diamonds > 0 ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`}>
                    1 diamond — Book at 6pm for next 7 days.
                  </p>
              }
              </div>
            </div>
            <button
            disabled={!canActivatePriority || savingPriority}
            onClick={() => setShowPriorityConfirm(true)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none
                ${isPriorityActive ? "bg-purple-500" : canActivatePriority ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300" : "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-40"}`}>
            
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPriorityActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* 30-min confirm dialog */}
          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚡ Activate Early 30-Min Access?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will consume <strong>{vipPrice} token{vipPrice !== 1 ? "s" : ""}</strong> ({tokens} remaining) and grant you <strong>30-minute early booking access</strong> for the next <strong>24 hours</strong> or until your next successful booking, whichever comes first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={saving} onClick={handleActivate} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {saving ? "Activating…" : "Activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 1-hour confirm dialog */}
          <AlertDialog open={showPlusConfirm} onOpenChange={setShowPlusConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>🚀 Activate Early 1-Hour Access?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will consume <strong>{VIP_PLUS_PRICE} tokens</strong> ({tokens} remaining) and grant you <strong>1-hour early booking access</strong> for the next <strong>24 hours</strong> or until your next successful booking, whichever comes first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={savingPlus} onClick={handleActivatePlus} className="bg-purple-500 hover:bg-purple-600 text-white">
                  {savingPlus ? "Activating…" : "Activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 7-day priority confirm dialog */}
          <AlertDialog open={showPriorityConfirm} onOpenChange={setShowPriorityConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>💎 Activate 7-Day Priority Access?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will consume <strong>1 diamond</strong> ({diamonds} remaining) and grant you <strong>priority booking access</strong> for the next <strong>7 days</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={savingPriority} onClick={handleActivatePriority} className="bg-purple-500 hover:bg-purple-600 text-white">
                  {savingPriority ? "Activating…" : "Activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    </>);

}