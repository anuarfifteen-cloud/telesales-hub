import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SLOTS, getBookableDates, formatDate, getUnlockTime, getAmSlots } from "@/lib/slots";
import { format as tzFormat } from "date-fns-tz";
const TZ = "Asia/Brunei";
import { useBruneiClock } from "@/hooks/useBruneiClock";
import SlotCard from "@/components/booking/SlotCard";
import DateTab from "@/components/booking/DateTab";
import MySchedule from "@/components/booking/MySchedule";
import LiveClock from "@/components/booking/LiveClock";
import { CalendarDays, ClipboardList, UserCircle, Bell, Settings, ArrowLeft, LogOut, Trash2, Plus, Moon, Clock, Coins, ArrowRightLeft } from "lucide-react";
import ShiftSwapPanel from "@/components/swap/ShiftSwapPanel";
import TokensTab from "./TokensTab";
import { getStoredTheme, applyTheme } from "@/lib/theme";
import AdminPinModal from "@/components/admin/AdminPinModal";
import AdminBookingTotals from "@/components/admin/AdminBookingTotals";
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
import AdminBookingSettings from "@/components/admin/AdminBookingSettings";
import AdminAnnouncement from "@/components/admin/AdminAnnouncement";
import AnnouncementPanel from "@/components/announcements/AnnouncementPanel";
import AnnouncementPopup from "@/components/announcements/AnnouncementPopup";
import RosterView from "@/components/roster/RosterView";
import { Button } from "@/components/ui/button";
import FeatureUnlockModal from "@/components/FeatureUnlockModal";
import { toast } from "sonner";

const EMPLOYEES = [
{ value: 1, label: "Aiman" }, { value: 2, label: "Adibah" },
{ value: 3, label: "Anil" }, { value: 4, label: "Nurul" },
{ value: 5, label: "Kash" }, { value: 6, label: "Salwa" },
{ value: 7, label: "Husnina" }, { value: 8, label: "Anwar" },
{ value: 9, label: "Sasha" }, { value: 10, label: "Aziemah" },
{ value: 11, label: "Kamaliah" }, { value: 12, label: "Atiqah" },
{ value: 13, label: "Halimatul" }, { value: 14, label: "Afiqah" }];

function formatCountdownHM(ms) {
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor(totalMins % 1440 / 60);
  const m = totalMins % 60;
  if (d >= 1) return `${d}D ${h}h ${String(m).padStart(2, "0")}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("booking");
  const [innerTab, setInnerTab] = useState("book");
  const [showPinModal, setShowPinModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminForm, setAdminForm] = useState({ date: "", employee: "", shift: "", task: "" });
  const [adminSaving, setAdminSaving] = useState(false);
  const [forceBookSlot, setForceBookSlot] = useState(null);
  const [forceBookEmployee, setForceBookEmployee] = useState("");
  const [customSlots, setCustomSlots] = useState(null); // null = use defaults
  const [unlockHour, setUnlockHour] = useState(19);
  const [unlockMinute, setUnlockMinute] = useState(30);
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredTheme());
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [serverTimeRef, setServerTimeRef] = useState(null);
  const [localTimeAtFetch, setLocalTimeAtFetch] = useState(null);
  const [showDstConfirm, setShowDstConfirm] = useState(false);
  const [showCancelDstConfirm, setShowCancelDstConfirm] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [unlockModal, setUnlockModal] = useState({ open: false, title: "", message: "" });

  const checkMilestones = async (totalCount) => {
    // Dark mode unlock at 5 bookings
    if (totalCount >= 5 && !localStorage.getItem("hasSeenDarkModeModal")) {
      localStorage.setItem("hasSeenDarkModeModal", "true");
      setUnlockModal({
        open: true,
        title: "🎉 Achievement Unlocked!",
        message: "Congratulations! You just hit 5 successful bookings and unlocked Dark Mode. You can now toggle your app theme in the Profile tab. Keep up the great work!"
      });
    }

    // Token milestone at 15 bookings: award 3 tokens
    if (totalCount >= 15) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["15"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 3,
          milestoneTokensAwarded: { ...awarded, "15": true }
        });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "🏆 Early Access Unlocked!",
          message: "Amazing! You've hit 15 bookings and earned 3 Early Access tokens. Spend a token to book your breaks 30 minutes early for 24 hours. Keep booking to earn more!"
        });
        return;
      }
    }

    // Token milestone at 30 bookings: award 5 additional tokens
    if (totalCount >= 30) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["30"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 5,
          milestoneTokensAwarded: { ...awarded, "30": true }
        });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "🌟 Bonus Tokens Awarded!",
          message: "Incredible! You've hit 30 bookings and earned 5 extra Early Access tokens on top of your remaining balance. Keep it up!"
        });
        return;
      }
    }

    // Token milestone at 50 bookings: award 10 tokens
    if (totalCount >= 50) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["50"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 10,
          milestoneTokensAwarded: { ...awarded, "50": true }
        });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "💎 Elite Milestone!",
          message: "Wow! You've hit 50 bookings and earned 10 Early Access tokens! You're on fire — keep going!"
        });
        return;
      }
    }

    // Token milestone at 100 bookings: award 20 tokens
    if (totalCount >= 100) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["100"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 20,
          milestoneTokensAwarded: { ...awarded, "100": true }
        });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "🚀 Legend Status!",
          message: "INCREDIBLE! 100 bookings! You've earned a massive 20 Early Access tokens. You are a true Telesales legend!"
        });
      }
    }
  };
  const [seenAnnouncementIds, setSeenAnnouncementIds] = useState(() => {
    try {return JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");} catch {return [];}
  });
  const bruneiNow = useBruneiClock(serverTimeRef, localTimeAtFetch);
  const dates = getBookableDates(bruneiNow);

  // Set selectedDate once server-corrected time is available
  useEffect(() => {
    if (serverTimeRef && dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [serverTimeRef]);
  const queryClient = useQueryClient();

  const refreshUser = async () => {
    const [u, timeRes] = await Promise.all([
      base44.auth.me(),
      base44.functions.invoke('getServerTime', {}).catch(() => null),
    ]);
    // Capture local time AFTER response arrives so offset = serverTime - localNow
    const localAfter = new Date();
    setLocalTimeAtFetch(localAfter);
    setServerTimeRef(timeRes?.data?.serverTime || null);
    setUser(u);
    return u;
  };

  useEffect(() => {
    refreshUser().catch(() => {});
    applyTheme(getStoredTheme());
  }, []);

  const handleToggleDarkMode = (val) => {
    setIsDarkMode(val);
    applyTheme(val);
  };

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: () =>
    selectedDate ? base44.entities.Booking.filter({ date: selectedDate }) : [],
    enabled: !!selectedDate
  });

  const { data: weekBookings = [] } = useQuery({
    queryKey: ["bookings-week", dates[0]],
    queryFn: () => base44.entities.Booking.list(),
    enabled: !!user
  });

  // Check milestones when booking data loads (for veterans opening the app)
  useEffect(() => {
    if (!user) return;
    const myCount = weekBookings.filter((b) => b.user_email === user.email).length;
    checkMilestones(myCount);
  }, [weekBookings, user]);

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50),
    refetchInterval: 60000
  });

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const activeAnnouncements = announcements.filter((a) => {
    if (Date.now() - new Date(a.created_date).getTime() >= TWENTY_FOUR_HOURS) return false;
    if (!a.targetUserId) return true; // global
    return user && a.targetUserId === user.id; // targeted
  });
  const hasUnread = activeAnnouncements.some((a) => !seenAnnouncementIds.includes(a.id));

  // Show popup for any active popup announcement the user hasn't dismissed yet
  useEffect(() => {
    if (!user) return;
    const pending = activeAnnouncements.find(
      (a) => a.isPopup && !localStorage.getItem(`seen_popup_${a.id}`)
    );
    if (pending) setActivePopup(pending);
  }, [announcements, user]);

  const handleOpenAnnouncements = () => {
    const ids = activeAnnouncements.map((a) => a.id);
    const merged = [...new Set([...seenAnnouncementIds, ...ids])];
    setSeenAnnouncementIds(merged);
    try {localStorage.setItem("seenAnnouncements", JSON.stringify(merged));} catch {}
    setShowAnnouncementPanel(true);
  };

  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
    });
    return unsub;
  }, [selectedDate]);

  const createMutation = useMutation({
    mutationFn: async (slot) => {
      // Pre-flight: check if user already has a booking for this date
      const dateBookings = await base44.entities.Booking.filter({ date: selectedDate, user_email: user.email });
      if (dateBookings.length > 0) {
        throw new Error("ALREADY_BOOKED");
      }

      // Pre-flight: check capacity
      const freshBookings = await base44.entities.Booking.filter({ date: selectedDate, slot_id: slot.id });
      if (freshBookings.length >= slot.maxBookings) {
        throw new Error("SLOT_FULL");
      }

      // Check if user has active VIP token
      const freshUserForVip = await base44.auth.me();
      const vipExp = freshUserForVip?.vipExpiresAt ? new Date(freshUserForVip.vipExpiresAt) : null;
      const usingVip = vipExp && vipExp.getTime() > Date.now();

      // Write the booking
      const newBooking = await base44.entities.Booking.create({
        date: selectedDate,
        slot_id: slot.id,
        slot_label: slot.label,
        shift: slot.shift,
        user_email: user.email,
        user_name: user.full_name,
        booked_at: tzFormat(new Date(), "hh:mm:ss.SSS aa", { timeZone: TZ }),
        vip_used: !!usingVip
      });

      // --- POST-WRITE TIMESTAMP TIE-BREAKER ---
      // Re-fetch ALL bookings for this slot now that we've written
      const allSlotBookings = await base44.entities.Booking.filter({ date: selectedDate, slot_id: slot.id });

      // Sort by database creation timestamp ascending (earliest = winner)
      const sorted = [...allSlotBookings].sort((a, b) =>
      new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      );

      const myIndex = sorted.findIndex((b) => b.id === newBooking.id);

      if (myIndex >= slot.maxBookings) {
        // LOSER — rolled past capacity, delete our booking and surface the error
        await base44.entities.Booking.delete(newBooking.id);
        throw new Error("RACE_CONDITION");
      }

      // WINNER — return the confirmed booking
      return newBooking;
    },
    onMutate: async (slot) => {
      await queryClient.cancelQueries({ queryKey: ["bookings", selectedDate] });
      const prev = queryClient.getQueryData(["bookings", selectedDate]);
      const prevWeekBookings = queryClient.getQueryData(["bookings-week", dates[0]]) || [];
      const prevMyBookings = prevWeekBookings.filter((b) => b.user_email === user?.email);
      const prevTotalBookingCount = prevMyBookings.length;

      const optimistic = {
        id: "__optimistic__",
        date: selectedDate,
        slot_id: slot.id,
        slot_label: slot.label,
        shift: slot.shift,
        user_email: user.email,
        user_name: user.full_name
      };
      queryClient.setQueryData(["bookings", selectedDate], (old = []) => [...old, optimistic]);
      queryClient.setQueryData(["bookings-week", dates[0]], (old = []) => [...old, optimistic]);
      return { prev, prevTotalBookingCount };
    },
    onSuccess: (newBooking, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
      toast.success("Booking successful! Your slot is confirmed.");

      const currentTotalBookingCount = context.prevTotalBookingCount + 1;
      checkMilestones(currentTotalBookingCount);

      // Reset VIP early access after a successful booking
      if (user?.vipExpiresAt) {
        base44.auth.updateMe({ vipExpiresAt: null }).then(refreshUser);
      }
    },
    onError: (err, slot, context) => {
      // Roll back optimistic update
      queryClient.setQueryData(["bookings", selectedDate], context.prev);
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });

      if (err.message === "RACE_CONDITION") {
        toast.error("Someone beat you to this slot by a millisecond. Your booking was voided — please select another slot.");
      } else if (err.message === "SLOT_FULL" || err.message === "ALREADY_BOOKED") {
        toast.error("This time slot is no longer available. Please select an alternative open slot.");
      } else {
        toast.error("Failed to book. Please try again.");
      }
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (booking) => base44.entities.Booking.delete(booking.id),
    onMutate: async (booking) => {
      await queryClient.cancelQueries({ queryKey: ["bookings", selectedDate] });
      const prev = queryClient.getQueryData(["bookings", selectedDate]);
      queryClient.setQueryData(["bookings", selectedDate], (old = []) =>
      old.filter((b) => b.id !== booking.id)
      );
      queryClient.setQueryData(["bookings-week", dates[0]], (old = []) =>
      old.filter((b) => b.id !== booking.id)
      );
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
      toast.success("Booking cancelled.");
    },
    onError: (err, booking, context) => {
      queryClient.setQueryData(["bookings", selectedDate], context.prev);
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
      toast.error("Failed to cancel. Please try again.");
    }
  });

  const handleAdminDeleteBooking = async (bookingId) => {
    await base44.entities.Booking.delete(bookingId);
    queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
    queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
    toast.success("Booking removed.");
  };

  const handleForceBook = async (slot) => {
    if (!forceBookEmployee.trim()) return;
    const name = forceBookEmployee.trim();
    await base44.entities.Booking.create({
      date: selectedDate,
      slot_id: slot.id,
      slot_label: slot.label,
      shift: slot.shift,
      user_email: `forcebook_${Date.now()}@telesales.local`,
      user_name: name,
      booked_at: tzFormat(new Date(), "hh:mm:ss.SSS aa", { timeZone: TZ })
    });
    queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
    setForceBookSlot(null);
    setForceBookEmployee("");
    toast.success(`${name} force-booked!`);
  };

  const handleBook = (slot) => {
    if (!user) return;
    createMutation.mutate(slot);
  };

  const handleCancel = (booking) => {
    cancelMutation.mutate(booking);
  };

  const baseAmSlots = getAmSlots(selectedDate);
  const basePmSlots = SLOTS.filter((s) => s.shift === "PM");
  const activeSlots = customSlots || SLOTS;
  const amSlots = customSlots ? activeSlots.filter((s) => s.shift === "AM") : baseAmSlots;
  const pmSlots = customSlots ? activeSlots.filter((s) => s.shift === "PM") : basePmSlots;

  const getBookedCount = (slotId) => bookings.filter((b) => b.slot_id === slotId).length;
  const getMyBooking = (slotId) =>
  bookings.find((b) => b.slot_id === slotId && b.user_email === user?.email);

  const isMutating = createMutation.isPending || cancelMutation.isPending;

  const myBookings = weekBookings.filter((b) => b.user_email === user?.email);
  const totalBookingCount = myBookings.length;

  // Token-based VIP early access check
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const isVipTokenActive = vipExpiresAt && vipExpiresAt.getTime() > Date.now();

  const unlockTime = selectedDate ? (() => {
    const base = getUnlockTime(selectedDate);
    if (isVipTokenActive) return new Date(base.getTime() - 30 * 60 * 1000);
    return base;
  })() : null;

  // Admin bypasses the lock entirely
  const effectiveUnlockTime = isAdmin ? new Date(0) : unlockTime;

  // Countdown for Log Activity button
  const msUntilOpen = effectiveUnlockTime ? effectiveUnlockTime.getTime() - bruneiNow.getTime() : 0;
  const bookingOpen = msUntilOpen <= 0;
  const dstCountdown = !bookingOpen ? formatCountdownHM(msUntilOpen) : null;

  const handleAdminSave = async () => {
    if (!adminForm.date || !adminForm.employee || !adminForm.shift) {
      toast.error("Please fill in date, employee and shift.");
      return;
    }
    setAdminSaving(true);
    const emp = EMPLOYEES.find((e) => String(e.value) === adminForm.employee);
    await base44.entities.RosterDatabase.create({
      date: adminForm.date,
      shift_type: adminForm.shift,
      employee_number: emp.value,
      employee_name: emp.label,
      daily_task: adminForm.task
    });
    toast.success("Assignment saved!");
    setAdminForm({ date: "", employee: "", shift: "", task: "" });
    setAdminSaving(false);
    queryClient.invalidateQueries({ queryKey: ["roster"] });
  };

  return (
    <div className="min-h-screen bg-background font-inter pb-32">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 sticky top-0 z-10" style={{ boxShadow: "0 1px 12px 0 rgba(0,0,0,0.08)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: logo + app title */}
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/a6f4605c6_generated_image.png"
              alt="Telesales Hub logo"
              className="h-9 w-9 rounded-xl object-cover flex-shrink-0" />
            
            <h1 className="text-xl text-slate-900 dark:text-white leading-tight" style={{ fontFamily: "'Pacifico', cursive" }}>Telesales Hub</h1>
          </div>

          {/* Right: token balance, admin badge, bell */}
          <div className="flex items-center gap-2">
            {/* Token balance pill */}
            <button
              onClick={() => setActiveTab("tokens")}
              className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
              <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="Token" className="w-4 h-4" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.earlyAccessTokens ?? 0}</span>
            </button>
            <button
              onClick={handleOpenAnnouncements}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-500" />
              {hasUnread && activeAnnouncements.length > 0 &&
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border border-white dark:border-slate-900">
                  {activeAnnouncements.length}
                </span>
              }
            </button>
            {isAdmin &&
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200">ADMIN</span>
            }
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-3 pb-6 space-y-4">

        {/* ── BOOKING TAB ── */}
        {activeTab === "booking" &&
        <>
            {/* Inner segmented control */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5">
              <button
              onClick={() => setInnerTab("book")}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              innerTab === "book" ?
              "bg-blue-600 text-white shadow-md" :
              "bg-transparent text-slate-500 hover:text-slate-700"}`
              }>
              
                <span>📆</span>
                Book a Slot
              </button>
              <button
              onClick={() => setInnerTab("schedule")}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              innerTab === "schedule" ?
              "bg-blue-600 text-white shadow-md" :
              "bg-transparent text-slate-500 hover:text-slate-700"}`
              }>
              
                <span>📋</span>
                Daily Schedule
              </button>
            </div>

            {/* Admin Tools */}
            {isAdmin &&
          <AdminAnnouncement adminName={user?.full_name} />
          }

            {/* Admin Booking Settings */}
            {isAdmin &&
          <AdminBookingSettings
            slots={customSlots || SLOTS}
            unlockHour={unlockHour}
            unlockMinute={unlockMinute}
            onSlotsChange={(s) => setCustomSlots(s)}
            onUnlockTimeChange={(h, m) => {setUnlockHour(h);setUnlockMinute(m);}} />

          }

            {/* Shared date picker */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Select Date
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {dates.map((d) =>
              <DateTab
                key={d}
                dateStr={d}
                isSelected={d === selectedDate}
                onClick={() => setSelectedDate(d)} />

              )}
              </div>
            </section>

            {/* ── Book a Slot inner view ── */}
            {innerTab === "book" &&
          <>
                <LiveClock now={bruneiNow} />

                {selectedDate &&
            <div>
                    <h2 className="font-semibold text-foreground text-base leading-tight">
                      {formatDate(selectedDate)}
                    </h2>
                    {effectiveUnlockTime && bruneiNow.getTime() < effectiveUnlockTime.getTime() && (() => {
                const [y, mo, d] = selectedDate.split("-").map(Number);
                const prevDay = new Date(y, mo - 1, d - 1);
                const dayNum = prevDay.getDate();
                const monthName = prevDay.toLocaleDateString("en-US", { month: "long" });
                return (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                          <p className="font-bold text-orange-800 dark:text-orange-300 text-sm">🔒 Booking not open yet.</p>
                          <p className="text-orange-700 dark:text-orange-400 text-sm mt-0.5">
                            Bookings open on {dayNum} {monthName} {unlockHour % 12 === 0 ? 12 : unlockHour % 12}:{String(unlockMinute).padStart(2, "0")} {unlockHour >= 12 ? "PM" : "AM"}.
                          </p>
                        </div>);

              })()}
                  </div>
            }

                {/* ── Off-Day / Duty Outside Office Log ── */}
                {(() => {
              const dstBooking = bookings.find(
                (b) => b.slot_id === "DST_POPUP" && b.user_email === user?.email
              );
              // Check if user already has a real break slot booking for this date
              const hasBreakBookingToday = bookings.some(
                (b) => b.user_email === user?.email && b.slot_id !== "DST_POPUP"
              );
              const isLocked = !bookingOpen && !dstBooking;
              const isDisabled = !user || isMutating || isLocked || hasBreakBookingToday;

              return (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🏖️</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Off-Day / DST Pop Up</p>
                          {hasBreakBookingToday && !dstBooking ?
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Already booked a slot today</p> :

                      <p className="text-[11px] text-muted-foreground">Friday AM Shift may earn one booking credit here</p>
                      }
                        </div>
                      </div>
                      {dstBooking ?
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700">
                            ✓ Logged
                          </span>
                          <button
                            onClick={() => setShowCancelDstConfirm(true)}
                            className="text-[10px] font-semibold text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors">
                            Cancel Log
                          </button>
                          <AlertDialog open={showCancelDstConfirm} onOpenChange={setShowCancelDstConfirm}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Logged Activity?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You can only claim <strong>one activity per day</strong> — either a break slot or an off-day/DST log, not both.<br /><br />
                                  Cancelling this log will remove your activity credit for <strong>{selectedDate}</strong> and allow you to book a break slot instead.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Log</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={async () => {
                                    await base44.entities.Booking.delete(dstBooking.id);
                                    queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
                                    queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
                                    toast.success("Activity log cancelled. You can now book a break slot.");
                                  }}>
                                  Yes, Cancel Log
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div> :
                  hasBreakBookingToday ?
                  <span className="flex-shrink-0 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 cursor-not-allowed">
                          🔒 Locked
                        </span> :

                  <>
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <button
                        disabled={isDisabled}
                        onClick={() => setShowDstConfirm(true)}
                        className="flex-shrink-0 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:bg-slate-400 flex items-center gap-1 tabular-nums">
                        
                              {dstCountdown ?
                        <>
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  {dstCountdown}
                                </> :

                        'Claim'
                        }
                            </button>
                            
                          </div>
                          <AlertDialog open={showDstConfirm} onOpenChange={setShowDstConfirm}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Log Off-Day / DST Pop Up?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will count as your activity for <strong>{selectedDate}</strong> and earn you 1 booking credit.
                                  <br /><br />
                                  <strong>⚠️ NOTE: This includes PL</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                            if (!user) return;
                            // Safety net: re-check for existing break slot bookings
                            const existingBreak = bookings.filter(
                              (b) => b.user_email === user.email && b.slot_id !== "DST_POPUP"
                            );
                            if (existingBreak.length > 0) {
                              setShowDstConfirm(false);
                              toast.error("Request Denied: You have already booked a break slot for this date. You cannot log off-day / DST Pop Up activity as well.");
                              return;
                            }
                            const existing = await base44.entities.Booking.filter({ date: selectedDate, slot_id: "DST_POPUP", user_email: user.email });
                            if (existing.length > 0) {toast.error("Already logged for today.");return;}
                            await base44.entities.Booking.create({
                              date: selectedDate,
                              slot_id: "DST_POPUP",
                              slot_label: "Off-Day / Duty Outside",
                              shift: "AM",
                              user_email: user.email,
                              user_name: user.full_name,
                              booked_at: tzFormat(new Date(), "hh:mm:ss.SSS aa", { timeZone: TZ })
                            });
                            queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
                            queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
                            toast.success("Off-Day/Duty logged! Credit earned.");
                          }}>
                                  Confirm & Log
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                  }
                    </div>);

            })()}

                {/* ── Inform user why slots are locked due to DST log ── */}
                {(() => {
                  const hasDstLog = bookings.some(
                    (b) => b.slot_id === "DST_POPUP" && b.user_email === user?.email
                  );
                  if (!hasDstLog) return null;
                  return (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-2">
                      <span className="text-base flex-shrink-0">ℹ️</span>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        <strong>Break slots are locked.</strong> You've already logged an Off-Day / DST activity today. Only one activity credit is allowed per day. To book a break slot instead, cancel your activity log above.
                      </p>
                    </div>
                  );
                })()}

                {isLoading ?
            <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) =>
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              )}
                  </div> :

            <>
                    {[{ label: "AM Shift", emoji: "🌤", slots: amSlots }, { label: "PM Shift", emoji: "🌆", slots: pmSlots }].map(({ label, emoji, slots }) =>
              <section key={label}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{emoji}</span>
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="space-y-1.5">
                          {slots.map((slot) => {
                    const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
                    const myBooking = getMyBooking(slot.id);
                    const isFull = getBookedCount(slot.id) >= slot.maxBookings;
                    return (
                      <div key={slot.id} className="space-y-1">
                                <SlotCard
                          slot={slot}
                          bookedCount={getBookedCount(slot.id)}
                          myBooking={myBooking}
                          onBook={handleBook}
                          onCancel={handleCancel}
                          unlockTime={effectiveUnlockTime}
                          now={bruneiNow}
                          loading={isMutating} />
                        
                                {isAdmin &&
                        <div className="pl-2 space-y-1">
                                    {slotBookings.map((b) =>
                          <div key={b.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                        <span className="text-xs text-red-700 font-medium">{b.user_name || b.user_email}</span>
                                        <button onClick={() => handleAdminDeleteBooking(b.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                          )}
                                    {!isFull && !slot.restriction && (
                          forceBookSlot?.id === slot.id ?
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                          <input
                              type="text"
                              value={forceBookEmployee}
                              onChange={(e) => setForceBookEmployee(e.target.value)}
                              placeholder="Type any name…"
                              className="flex-1 text-xs border-0 bg-transparent text-slate-700 focus:outline-none placeholder:text-slate-400" />
                            
                                          <button onClick={() => handleForceBook(slot)} className="text-xs font-bold text-blue-600 hover:text-blue-800">Book</button>
                                          <button onClick={() => {setForceBookSlot(null);setForceBookEmployee("");}} className="text-xs text-slate-400">✕</button>
                                        </div> :

                          <button onClick={() => {setForceBookSlot(slot);setForceBookEmployee("");}} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                                          <Plus className="w-3 h-3" /> Force book
                                        </button>)

                          }
                                  </div>
                        }
                              </div>);

                  })}
                        </div>
                      </section>
              )}
                  </>
            }
              </>
          }

            {/* ── Daily Schedule inner view ── */}
            {innerTab === "schedule" &&
          <>
                {selectedDate &&
            <h2 className="font-semibold text-foreground text-base leading-tight">
                    {formatDate(selectedDate)}
                  </h2>
            }
                <MySchedule bookings={bookings} selectedDate={selectedDate} />
              </>
          }
          </>
        }

        {/* ── TOKENS TAB ── */}
        {activeTab === "tokens" && (
          <TokensTab user={user} onUserUpdate={refreshUser} totalBookingCount={totalBookingCount} isAdmin={isAdmin} />
        )}

        {/* ── ROSTER TAB ── */}
        {activeTab === "roster" && <RosterView isAdmin={isAdmin} />}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (() => {
          const amCount = myBookings.filter((b) => b.shift === "AM").length;
          const pmCount = myBookings.filter((b) => b.shift === "PM").length;
          const totalCount = totalBookingCount;
          const darkModeUnlocked = totalCount >= 5;
          const initials = user?.full_name ?
          user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) :
          (user?.email?.[0] || "?").toUpperCase();

          return (
            <div className="relative flex flex-col gap-4 pb-4">
              {/* Admin Banner */}
              {isAdminLoggedIn &&
              <div className="flex items-center justify-between bg-red-600 text-white rounded-xl px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-bold">Admin Mode: ACTIVE</span>
                  </div>
                  <button
                  onClick={() => {setIsAdminLoggedIn(false);setIsAdmin(false);}}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                  
                    <ArrowLeft className="w-3 h-3" /> Exit
                  </button>
                </div>
              }

              {/* Avatar + Name */}
              <div className="flex flex-col items-center pt-4 gap-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg ring-4 ring-blue-100 dark:ring-blue-900">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100 leading-tight">
                    {user?.full_name || "My Profile"}
                  </h2>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">All-Time</p>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {[
                  { label: "Bookings", value: totalCount },
                  { label: "AM", value: amCount },
                  { label: "PM", value: pmCount }].
                  map(({ label, value }) =>
                  <div key={label} className="flex flex-col items-center gap-0.5 px-2">
                      <span className="text-2xl font-bold text-slate-800 dark:text-gray-100">{value}</span>
                      <span className="text-[11px] text-muted-foreground dark:text-gray-400">{label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Work Hours */}
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide">⏰ Official Work Hours</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌅</span>
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">AM Shift</span>
                    </div>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">09:00 – 18:00</span>
                  </div>
                  <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/40 rounded-xl px-3 py-2.5 border border-violet-100 dark:border-violet-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌆</span>
                      <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">PM Shift</span>
                    </div>
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full">13:00 – 21:00</span>
                  </div>
                </div>
              </div>

              {/* App Settings */}
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-3 uppercase tracking-wide">⚙️ APP SETTINGS</p>
                <div className="space-y-4">
                  {/* Dark Mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className={`w-4 h-4 ${darkModeUnlocked ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600"}`} />
                      <div>
                        <span className={`text-sm font-medium ${darkModeUnlocked ? "text-slate-700 dark:text-gray-300" : "text-slate-400 dark:text-slate-500"}`}>Dark Mode</span>
                        {!darkModeUnlocked &&
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">🔒 Unlocks at 5 Bookings</p>
                        }
                      </div>
                    </div>
                    {darkModeUnlocked ? (
                      <button
                        onClick={() => handleToggleDarkMode(!isDarkMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? "bg-blue-600" : "bg-slate-200"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDarkMode ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    ) : (
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-100 cursor-not-allowed opacity-50">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow translate-x-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Admin: Booking Totals */}
              {isAdmin && <AdminBookingTotals />}

              {/* Log Out */}
              <Button
                variant="outline"
                onClick={() => base44.auth.logout()}
                className="gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 w-full">
                
                <LogOut className="w-4 h-4" /> Log Out
              </Button>

              {/* Stealth Admin Gear */}
              <button
                onClick={() => setShowPinModal(true)}
                className="absolute bottom-0 right-0 p-2 opacity-20 hover:opacity-40 transition-opacity"
                aria-label="">
                
                <Settings className="w-4 h-4 text-slate-500" />
              </button>
            </div>);

        })()}
      </main>

      {/* Swap Panel */}
      <AnimatePresence>
        {showSwapPanel && (
          <ShiftSwapPanel
            user={user}
            myBookings={weekBookings.filter((b) => b.user_email === user?.email && b.slot_id !== "DST_POPUP")}
            onClose={() => setShowSwapPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* PIN Modal */}
      {showPinModal &&
      <AdminPinModal
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {setShowPinModal(false);setIsAdminLoggedIn(true);setIsAdmin(true);}} />

      }

      {showAnnouncementPanel &&
      <AnnouncementPanel
        announcements={announcements}
        onClose={() => setShowAnnouncementPanel(false)} />
      }

      <AnnouncementPopup
        announcement={activePopup}
        onDismiss={() => setActivePopup(null)} />

      <FeatureUnlockModal
        isOpen={unlockModal.open}
        onClose={() => setUnlockModal((m) => ({ ...m, open: false }))}
        title={unlockModal.title}
        message={unlockModal.message} />

      {/* ── SWAP FLOATING BUTTON (booking tab only) ── */}
      {activeTab === "booking" && (
        <button
          onClick={() => setShowSwapPanel(true)}
          className="fixed bottom-24 right-5 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Swap Slot
        </button>
      )}

      {/* ── FLOATING PILL BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex items-center justify-around px-3 py-1.5 rounded-full"
          style={{
            width: "90%",
            maxWidth: "420px",
            background: isDarkMode
              ? "rgba(15, 23, 42, 0.92)"
              : "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
            border: isDarkMode
              ? "1px solid rgba(255,255,255,0.10)"
              : "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {[
            { id: "booking", label: "Booking", icon: CalendarDays },
            { id: "roster", label: "Roster", icon: ClipboardList },
            { id: "tokens", label: "Tokens", icon: Coins },
            { id: "profile", label: "Profile", icon: UserCircle },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-full transition-all ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDarkMode ? "text-slate-400" : "text-slate-400"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[9px] font-semibold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>);

}