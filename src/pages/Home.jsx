import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SLOTS, getBookableDates, formatDate, getUnlockTime, getAmSlots } from "@/lib/slots";
import { format as tzFormat } from "date-fns-tz";
import { useBruneiClock } from "@/hooks/useBruneiClock";
import SlotCard from "@/components/booking/SlotCard";
import DateTab from "@/components/booking/DateTab";
import MySchedule from "@/components/booking/MySchedule";
import LiveClock from "@/components/booking/LiveClock";
import { CalendarDays, ClipboardList, UserCircle, Bell, Settings, ArrowLeft, LogOut, Trash2, Plus, Moon, Clock, Coins, Camera } from "lucide-react";
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
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import AdminBookingSettings from "@/components/admin/AdminBookingSettings";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAnnouncement from "@/components/admin/AdminAnnouncement";
import AnnouncementPanel from "@/components/announcements/AnnouncementPanel";
import AnnouncementPopup from "@/components/announcements/AnnouncementPopup";
import RosterView from "@/components/roster/RosterView";
import { Button } from "@/components/ui/button";
import FeatureUnlockModal from "@/components/FeatureUnlockModal";
import DailySpinWheel from "@/components/booking/DailySpinWheel";
import TokenVoucher from "@/components/booking/MysteryBoxModal";
import { toast } from "sonner";

// --- Configuration & Constants ---
const TZ = "Asia/Brunei";

const EMPLOYEES = [
  { value: 1, label: "Aiman" }, { value: 2, label: "Adibah" },
  { value: 3, label: "Anil" }, { value: 4, label: "Nurul" },
  { value: 5, label: "Kash" }, { value: 6, label: "Salwa" },
  { value: 7, label: "Husnina" }, { value: 8, label: "Anwar" },
  { value: 9, label: "Sasha" }, { value: 10, label: "Aziemah" },
  { value: 11, label: "Kamaliah" }, { value: 12, label: "Atiqah" },
  { value: 13, label: "Halimatul" }, { value: 14, label: "Afiqah" }
];

const AVATAR_PRESETS = [
  {
    id: "man",
    name: "Male Representative",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%232563EB'/><circle cx='50' cy='40' r='20' fill='white'/><path d='M20,80 C20,60 80,60 80,80' fill='white'/></svg>"
  },
  {
    id: "woman",
    name: "Female Representative",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23DB2777'/><circle cx='50' cy='40' r='18' fill='white'/><path d='M18,82 C18,62 82,62 82,82' fill='white'/><path d='M32,30 Q50,15 68,30' fill='none' stroke='white' stroke-width='6'/></svg>"
  }
];

// --- Global Utilities ---
function formatCountdownHM(ms) {
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor(totalMins % 1440 / 60);
  const m = totalMins % 60;
  if (d >= 1) return `${d}D ${h}h ${String(m).padStart(2, "0")}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// --- Environment Initialization / Initial Onboarding View ---
function AvatarSelectionScreen({ selected, onSelect, onConfirm }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col items-center justify-center font-sans p-5">
      <h1 className="text-3xl font-bold mb-2.5 text-center">
        Select Representative Profile
      </h1>
      <p className="text-slate-400 mb-10 text-center max-w-md">
        Choose an option below to initialize your application environment.
      </p>

      <div className="flex gap-8 flex-wrap justify-center max-w-2xl w-full">
        {AVATAR_PRESETS.map((profile) => (
          <div
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            className={`bg-slate-800 rounded-2xl p-8 w-52 text-center cursor-pointer transition-all duration-200 shadow-xl border-3 ${
              selected === profile.id ? 'border-blue-500 scale-[1.02]' : 'border-transparent hover:scale-[1.01]'
            }`}
          >
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-24 h-24 rounded-full mx-auto mb-5 object-cover"
            />
            <h3 className="text-lg font-semibold mb-4">{profile.name}</h3>
            <button className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
              selected === profile.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
            }`}>
              {selected === profile.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-10">
          <button 
            onClick={onConfirm}
            className="bg-emerald-600 text-white py-3 px-8 rounded-lg font-bold text-lg shadow-[0_4px_6px_-1px_rgba(16,185,129,0.3)] hover:bg-emerald-500 transition-colors"
          >
            Confirm & Continue
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Hub Container ---
export default function Home() {
  // Application Flow Control State
  const [appInitialized, setAppInitialized] = useState(false);
  const [representativeSelected, setRepresentativeSelected] = useState(null);

  // Core Booking States
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
  const [customSlots, setCustomSlots] = useState(null); 
  const [unlockHour, setUnlockHour] = useState(19);
  const [unlockMinute, setUnlockMinute] = useState(30);
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredTheme());
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const [serverTimeRef, setServerTimeRef] = useState(null);
  const [localTimeAtFetch, setLocalTimeAtFetch] = useState(null);
  const [showDstConfirm, setShowDstConfirm] = useState(false);
  const [showCancelDstConfirm, setShowCancelDstConfirm] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [unlockModal, setUnlockModal] = useState({ open: false, title: "", message: "" });
  
  // Custom Avatar Picker States
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    return localStorage.getItem("profile_avatar_id") || "man-corporate";
  });

  const checkMilestones = async (totalCount) => {
    if (totalCount >= 5 && !localStorage.getItem("hasSeenDarkModeModal")) {
      localStorage.setItem("hasSeenDarkModeModal", "true");
      setUnlockModal({
        open: true,
        title: "🎉 Achievement Unlocked!",
        message: "Congratulations! You just hit 5 successful bookings and unlocked Dark Mode. You can now toggle your app theme in the Profile tab. Keep up the great work!"
      });
    }

    if (totalCount >= 15) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["15"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 3,
          milestoneTokensAwarded: { ...awarded, "15": true }
        });
        await base44.entities.TokenTransaction.create({ user_id: freshUser.id, user_name: freshUser.full_name || freshUser.email, amount: 3, source: "Booking Milestone — 15 Bookings", timestamp: new Date().toISOString() });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "🏆 Early Access Unlocked!",
          message: "Amazing! You've hit 15 bookings and earned 3 Early Access tokens. Spend a token to book your breaks 30 minutes early for 24 hours. Keep booking to earn more!"
        });
        return;
      }
    }

    if (totalCount >= 30) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["30"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 5,
          milestoneTokensAwarded: { ...awarded, "30": true }
        });
        await base44.entities.TokenTransaction.create({ user_id: freshUser.id, user_name: freshUser.full_name || freshUser.email, amount: 5, source: "Booking Milestone — 30 Bookings", timestamp: new Date().toISOString() });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "🌟 Bonus Tokens Awarded!",
          message: "Incredible! You've hit 30 bookings and earned 5 extra Early Access tokens on top of your remaining balance. Keep it up!"
        });
        return;
      }
    }

    if (totalCount >= 50) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["50"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 10,
          milestoneTokensAwarded: { ...awarded, "50": true }
        });
        await base44.entities.TokenTransaction.create({ user_id: freshUser.id, user_name: freshUser.full_name || freshUser.email, amount: 10, source: "Booking Milestone — 50 Bookings", timestamp: new Date().toISOString() });
        await refreshUser();
        setUnlockModal({
          open: true,
          title: "💎 Elite Milestone!",
          message: "Wow! You've hit 50 bookings and earned 10 Early Access tokens! You're on fire — keep going!"
        });
        return;
      }
    }

    if (totalCount >= 100) {
      const freshUser = await base44.auth.me();
      const awarded = freshUser?.milestoneTokensAwarded || {};
      if (!awarded["100"]) {
        const currentTokens = freshUser?.earlyAccessTokens ?? 0;
        await base44.auth.updateMe({
          earlyAccessTokens: currentTokens + 20,
          milestoneTokensAwarded: { ...awarded, "100": true }
        });
        await base44.entities.TokenTransaction.create({ user_id: freshUser.id, user_name: freshUser.full_name || freshUser.email, amount: 20, source: "Booking Milestone — 100 Bookings", timestamp: new Date().toISOString() });
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
    try { return JSON.parse(localStorage.getItem("seenAnnouncements") || "[]"); } catch { return []; }
  });

  const bruneiNow = useBruneiClock(serverTimeRef, localTimeAtFetch);
  const dates = getBookableDates(bruneiNow);

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

  const handleSaveAvatarChoice = (id) => {
    setSelectedAvatarId(id);
    localStorage.setItem("profile_avatar_id", id);
    setIsAvatarModalOpen(false);
    toast.success("Profile appearance synchronized!");
  };

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: () => selectedDate ? base44.entities.Booking.filter({ date: selectedDate }) : [],
    enabled: !!selectedDate
  });

  const { data: weekBookings = [] } = useQuery({
    queryKey: ["bookings-week", dates[0]],
    queryFn: () => base44.entities.Booking.list(),
    enabled: !!user
  });

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
    if (!a.targetUserId) return true; 
    return user && a.targetUserId === user.id; 
  });
  const hasUnread = activeAnnouncements.some((a) => !seenAnnouncementIds.includes(a.id));

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
    try { localStorage.setItem("seenAnnouncements", JSON.stringify(merged)); } catch {}
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
      const dateBookings = await base44.entities.Booking.filter({ date: selectedDate, user_email: user.email });
      if (dateBookings.length > 0) throw new Error("ALREADY_BOOKED");

      const freshBookings = await base44.entities.Booking.filter({ date: selectedDate, slot_id: slot.id });
      if (freshBookings.length >= slot.maxBookings) throw new Error("SLOT_FULL");

      const freshUserForVip = await base44.auth.me();
      const vipExp = freshUserForVip?.vipExpiresAt ? new Date(freshUserForVip.vipExpiresAt) : null;
      const usingVip = vipExp && vipExp.getTime() > Date.now();

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

      const allSlotBookings = await base44.entities.Booking.filter({ date: selectedDate, slot_id: slot.id });
      const sorted = [...allSlotBookings].sort((a, b) =>
        new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      );

      const myIndex = sorted.findIndex((b) => b.id === newBooking.id);
      if (myIndex >= slot.maxBookings) {
        await base44.entities.Booking.delete(newBooking.id);
        throw new Error("RACE_CONDITION");
      }
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

      if (user?.vipExpiresAt) {
        base44.auth.updateMe({ vipExpiresAt: null }).then(refreshUser);
      }
    },
    onError: (err, slot, context) => {
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
      queryClient.setQueryData(["bookings", selectedDate], (old = []) => old.filter((b) => b.id !== booking.id));
      queryClient.setQueryData(["bookings-week", dates[0]], (old = []) => old.filter((b) => b.id !== booking.id));
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
  const getMyBooking = (slotId) => bookings.find((b) => b.slot_id === slotId && b.user_email === user?.email);

  const isMutating = createMutation.isPending || cancelMutation.isPending;
  const myBookings = weekBookings.filter((b) => b.user_email === user?.email);
  const totalBookingCount = myBookings.length;

  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const isVipTokenActive = vipExpiresAt && vipExpiresAt.getTime() > Date.now();

  const unlockTime = selectedDate ? (() => {
    const base = getUnlockTime(selectedDate);
    if (isVipTokenActive) return new Date(base.getTime() - 30 * 60 * 1000);
    return base;
  })() : null;

  const effectiveUnlockTime = isAdmin ? new Date(0) : unlockTime;
  const msUntilOpen = effectiveUnlockTime ? effectiveUnlockTime.getTime() - bruneiNow.getTime() : 0;
  const bookingOpen = msUntilOpen <= 0;
  const dstCountdown = !bookingOpen ? formatCountdownHM(msUntilOpen) : null;

  // Intercept view rendering if initialization splash window is active
  if (!appInitialized) {
    return (
      <AvatarSelectionScreen 
        selected={representativeSelected}
        onSelect={setRepresentativeSelected}
        onConfirm={() => {
          alert(`Initialized with: ${representativeSelected}`);
          setAppInitialized(true);
        }}
      />
    );
  }

  // Primary Application View
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20 font-inter pb-32 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800/80 shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/a6f4605c6_generated_image.png"
              alt="Telesales Hub logo"
              className="h-9 w-9 rounded-xl object-cover flex-shrink-0 ring-2 ring-blue-500/10" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Pacifico', cursive" }}>Telesales Hub</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("tokens")}
              className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 px-3 py-1 rounded-full hover:bg-amber-500/15 transition-all group">
              <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="Token" className="w-4 h-4 scale-95 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{user?.earlyAccessTokens ?? 0}</span>
            </button>
            <button
              onClick={handleOpenAnnouncements}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              {hasUnread && activeAnnouncements.length > 0 &&
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              }
            </button>
            {isAdmin &&
              <button
                onClick={() => setActiveTab("admin")}
                className="text-[10px] font-bold tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-md border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                ADMIN
              </button>
            }
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-6 space-y-5">
        {/* ── BOOKING TAB ── */}
        {activeTab === "booking" && (
          <>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1">
              <button
                onClick={() => setInnerTab("book")}
                className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  innerTab === "book" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                <span>📆</span> Book a Slot
              </button>
              <button
                onClick={() => setInnerTab("schedule")}
                className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  innerTab === "schedule" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                <span>📋</span> Daily Schedule
              </button>
            </div>

            {isAdmin && <AdminAnnouncement adminName={user?.full_name} />}
            {isAdmin && (
              <AdminBookingSettings
                slots={customSlots || SLOTS}
                unlockHour={unlockHour}
                unlockMinute={unlockMinute}
                onSlotsChange={(s) => setCustomSlots(s)}
                onUnlockTimeChange={(h, m) => { setUnlockHour(h); setUnlockMinute(m); }} />
            )}

            <DailySpinWheel user={user} onUserUpdate={refreshUser} />

            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Select Date</p>
              <div className="grid grid-cols-7 gap-1.5">
                {dates.map((d) => (
                  <DateTab key={d} dateStr={d} isSelected={d === selectedDate} onClick={() => setSelectedDate(d)} />
                ))}
              </div>
            </section>

            {innerTab === "book" && (
              <>
                <LiveClock now={bruneiNow} />
                {selectedDate && (
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{formatDate(selectedDate)}</h2>
                  </div>
                )}

                {selectedDate && effectiveUnlockTime && bruneiNow.getTime() < effectiveUnlockTime.getTime() && (() => {
                  const [y, mo, d] = selectedDate.split("-").map(Number);
                  const prevDay = new Date(y, mo - 1, d - 1);
                  const dayNum = prevDay.getDate();
                  const monthName = prevDay.toLocaleDateString("en-US", { month: "long" });
                  return (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 shadow-sm">
                      <p className="font-semibold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5">🔒 Booking Window Paused</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                        Slots unlock on {dayNum} {monthName} {unlockHour % 12 === 0 ? 12 : unlockHour % 12}:{String(unlockMinute).padStart(2, "0")} {unlockHour >= 12 ? "PM" : "AM"}.
                      </p>
                    </div>
                  );
                })()}

                {(() => {
                  const dstBooking = bookings.find((b) => b.slot_id === "DST_POPUP" && b.user_email === user?.email);
                  const hasBreakBookingToday = bookings.some((b) => b.user_email === user?.email && b.slot_id !== "DST_POPUP");
                  const isLocked = !bookingOpen && !dstBooking;
                  const isDisabled = !user || isMutating || isLocked || hasBreakBookingToday;

                  return (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">🏖️</div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Off-Day / DST Pop Up</p>
                          {hasBreakBookingToday && !dstBooking ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium mt-0.5">Alternative break already recorded</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">AM Friday shift grants authorization here</p>
                          )}
                        </div>
                      </div>
                      {dstBooking ? (
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/10">✓ LOGGED</span>
                          <button onClick={() => setShowCancelDstConfirm(true)} className="text-[10px] font-medium text-slate-400 hover:text-rose-500 transition-colors underline underline-offset-4">Cancel Entry</button>
                          
                          <AlertDialog open={showCancelDstConfirm} onOpenChange={setShowCancelDstConfirm}>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base font-semibold">Revoke Logged Activity?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
                                  Are you sure you want to remove your dynamic activity logs for this slot?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="text-xs">Go Back</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => {
                                    handleCancel(dstBooking);
                                    setShowCancelDstConfirm(false);
                                  }} 
                                  className="text-xs bg-rose-600 hover:bg-rose-500"
                                >
                                  Confirm Deletion
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}