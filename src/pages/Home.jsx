import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SLOTS, getBookableDates, formatDate, getUnlockTime, getAmSlots } from "@/lib/slots";
import { format as tzFormat } from "date-fns-tz";
const TZ = "Asia/Brunei";
import { useBruneiClock } from "@/hooks/useBruneiClock";
import SlotCard from "@/components/booking/SlotCard";
import DateTab from "@/components/booking/DateTab";
import MySchedule from "@/components/booking/MySchedule";
import LiveClock from "@/components/booking/LiveClock";
import { CalendarDays, ClipboardList, UserCircle, Bell, Settings, ArrowLeft, LogOut, Trash2, Plus } from "lucide-react";
import AdminPinModal from "@/components/admin/AdminPinModal";
import RosterView from "@/components/roster/RosterView";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EMPLOYEES = [
  { value: 1, label: "Aiman" }, { value: 2, label: "Adibah" },
  { value: 3, label: "Anil" }, { value: 4, label: "Nurul" },
  { value: 5, label: "Kash" }, { value: 6, label: "Salwa" },
  { value: 7, label: "Husnina" }, { value: 8, label: "Anwar" },
  { value: 9, label: "Sasha" }, { value: 10, label: "Aziemah" },
  { value: 11, label: "Kamaliah" }, { value: 12, label: "Atiqah" },
  { value: 13, label: "Halimatul" }, { value: 14, label: "Afiqah" },
];

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
  const dates = getBookableDates();
  const queryClient = useQueryClient();
  const bruneiNow = useBruneiClock();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    setSelectedDate(dates[0]);
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: () =>
      selectedDate ? base44.entities.Booking.filter({ date: selectedDate }) : [],
    enabled: !!selectedDate,
  });

  const { data: weekBookings = [] } = useQuery({
    queryKey: ["bookings-week", dates[0]],
    queryFn: () => base44.entities.Booking.list(),
    enabled: !!user,
  });

  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
    });
    return unsub;
  }, [selectedDate]);

  const createMutation = useMutation({
    mutationFn: (slot) =>
      base44.entities.Booking.create({
        date: selectedDate,
        slot_id: slot.id,
        slot_label: slot.label,
        shift: slot.shift,
        user_email: user.email,
        user_name: user.full_name,
        booked_at: tzFormat(new Date(), "hh:mm:ss aa", { timeZone: TZ }),
      }),
    onMutate: async (slot) => {
      await queryClient.cancelQueries({ queryKey: ["bookings", selectedDate] });
      const prev = queryClient.getQueryData(["bookings", selectedDate]);
      const optimistic = {
        id: "__optimistic__",
        date: selectedDate,
        slot_id: slot.id,
        slot_label: slot.label,
        shift: slot.shift,
        user_email: user.email,
        user_name: user.full_name,
      };
      queryClient.setQueryData(["bookings", selectedDate], (old = []) => [...old, optimistic]);
      queryClient.setQueryData(["bookings-week", dates[0]], (old = []) => [...old, optimistic]);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
      toast.success("Break booked successfully!");
    },
    onError: (err, slot, context) => {
      queryClient.setQueryData(["bookings", selectedDate], context.prev);
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
      toast.error("Failed to book. Please try again.");
    },
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
    },
  });

  const handleBook = (slot) => {
    if (!user) return;
    const existing = bookings.find((b) => b.user_email === user.email);
    if (existing) {
      toast.error("You already have a break booked for this day.");
      return;
    }
    createMutation.mutate(slot);
  };

  const handleCancel = (booking) => {
    cancelMutation.mutate(booking);
  };

  const amSlots = getAmSlots(selectedDate);
  const pmSlots = SLOTS.filter((s) => s.shift === "PM");

  const getBookedCount = (slotId) => bookings.filter((b) => b.slot_id === slotId).length;
  const getMyBooking = (slotId) =>
    bookings.find((b) => b.slot_id === slotId && b.user_email === user?.email);

  const isMutating = createMutation.isPending || cancelMutation.isPending;
  const unlockTime = selectedDate ? getUnlockTime(selectedDate) : null;

  const handleAdminDeleteBooking = async (bookingId) => {
    await base44.entities.Booking.delete(bookingId);
    queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
    queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
    toast.success("Booking removed.");
  };

  const handleForceBook = async (slot) => {
    if (!forceBookEmployee) return;
    const emp = EMPLOYEES.find(e => String(e.value) === forceBookEmployee);
    await base44.entities.Booking.create({
      date: selectedDate,
      slot_id: slot.id,
      slot_label: slot.label,
      shift: slot.shift,
      user_email: `emp${emp.value}@telesales.local`,
      user_name: emp.label,
      booked_at: tzFormat(new Date(), "hh:mm:ss aa", { timeZone: TZ }),
    });
    queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
    setForceBookSlot(null);
    setForceBookEmployee("");
    toast.success(`${emp.label} force-booked!`);
  };

  const handleAdminSave = async () => {
    if (!adminForm.date || !adminForm.employee || !adminForm.shift) {
      toast.error("Please fill in date, employee and shift.");
      return;
    }
    setAdminSaving(true);
    const emp = EMPLOYEES.find(e => String(e.value) === adminForm.employee);
    await base44.entities.RosterDatabase.create({
      date: adminForm.date,
      shift_type: adminForm.shift,
      employee_number: emp.value,
      employee_name: emp.label,
      daily_task: adminForm.task,
    });
    toast.success("Assignment saved!");
    setAdminForm({ date: "", employee: "", shift: "", task: "" });
    setAdminSaving(false);
    queryClient.invalidateQueries({ queryKey: ["roster"] });
  };

  return (
    <div className="min-h-screen bg-background font-inter pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10" style={{ boxShadow: "0 1px 12px 0 rgba(0,0,0,0.08)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: spacer */}
          <div className="w-9" />

          {/* Center: app title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl text-slate-900 leading-tight" style={{ fontFamily: "'Pacifico', cursive" }}>Telesales Hub</h1>
            {user && (
              <p className="text-[11px] text-slate-400 leading-tight">
                {user.full_name?.split(" ")[0] || user.email}
              </p>
            )}
          </div>

          {/* Right: admin badge or bell */}
          {isAdmin ? (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200">ADMIN</span>
          ) : (
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-3 pb-6 space-y-4">

        {/* ── BOOKING TAB ── */}
        {activeTab === "booking" && (
          <>
            {/* Inner segmented control */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1.5">
              <button
                onClick={() => setInnerTab("book")}
                className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  innerTab === "book"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <span>📆</span>
                Book a Slot
              </button>
              <button
                onClick={() => setInnerTab("schedule")}
                className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  innerTab === "schedule"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <span>📋</span>
                Daily Schedule
              </button>
            </div>

            {/* Shared date picker */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Select Date
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {dates.map((d) => (
                  <DateTab
                    key={d}
                    dateStr={d}
                    isSelected={d === selectedDate}
                    onClick={() => setSelectedDate(d)}
                  />
                ))}
              </div>
            </section>

            {/* ── Book a Slot inner view ── */}
            {innerTab === "book" && (
              <>
                <LiveClock />

                {selectedDate && (
                  <div>
                    <h2 className="font-semibold text-foreground text-base leading-tight">
                      {formatDate(selectedDate)}
                    </h2>
                    {unlockTime && bruneiNow < unlockTime && (() => {
                      const [y, mo, d] = selectedDate.split("-").map(Number);
                      const prevDay = new Date(y, mo - 1, d - 1);
                      const dayNum = prevDay.getDate();
                      const monthName = prevDay.toLocaleDateString("en-US", { month: "long" });
                      return (
                        <div className="mt-2 bg-amber-50 border border-orange-200 rounded-lg p-3">
                          <p className="font-bold text-orange-800 text-sm">🔒 Booking not open yet.</p>
                          <p className="text-orange-700 text-sm mt-0.5">
                            Bookings open on {dayNum} {monthName} 7:30 PM.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {[{ label: "AM Shift", emoji: "🌤", slots: amSlots }, { label: "PM Shift", emoji: "🌆", slots: pmSlots }].map(({ label, emoji, slots }) => (
                      <section key={label}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{emoji}</span>
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="space-y-1.5">
                          {slots.map((slot) => {
                            const slotBookings = bookings.filter(b => b.slot_id === slot.id);
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
                                  unlockTime={unlockTime}
                                  now={bruneiNow}
                                  loading={isMutating}
                                />
                                {isAdmin && (
                                  <div className="pl-2 space-y-1">
                                    {slotBookings.map(b => (
                                      <div key={b.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                        <span className="text-xs text-red-700 font-medium">{b.user_name || b.user_email}</span>
                                        <button onClick={() => handleAdminDeleteBooking(b.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                    {!isFull && !slot.restriction && (
                                      forceBookSlot?.id === slot.id ? (
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                          <select
                                            value={forceBookEmployee}
                                            onChange={e => setForceBookEmployee(e.target.value)}
                                            className="flex-1 text-xs border-0 bg-transparent text-slate-700 focus:outline-none"
                                          >
                                            <option value="">Select employee…</option>
                                            {EMPLOYEES.map(emp => <option key={emp.value} value={String(emp.value)}>{emp.label}</option>)}
                                          </select>
                                          <button onClick={() => handleForceBook(slot)} className="text-xs font-bold text-blue-600 hover:text-blue-800">Book</button>
                                          <button onClick={() => { setForceBookSlot(null); setForceBookEmployee(""); }} className="text-xs text-slate-400">✕</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => { setForceBookSlot(slot); setForceBookEmployee(""); }} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                                          <Plus className="w-3 h-3" /> Force book
                                        </button>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── Daily Schedule inner view ── */}
            {innerTab === "schedule" && (
              <>
                {selectedDate && (
                  <h2 className="font-semibold text-foreground text-base leading-tight">
                    {formatDate(selectedDate)}
                  </h2>
                )}
                <MySchedule bookings={bookings} selectedDate={selectedDate} />
              </>
            )}
          </>
        )}

        {/* ── ROSTER TAB ── */}
        {activeTab === "roster" && <RosterView isAdmin={isAdmin} />}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <>
            {!isAdminLoggedIn ? (
              <div className="flex flex-col items-center py-20 text-center gap-3 min-h-[60vh] relative">
                <UserCircle className="w-12 h-12 text-muted-foreground/40" />
                <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
                <p className="text-sm text-muted-foreground">Coming Soon</p>

                <Button variant="outline" onClick={() => base44.auth.logout()} className="mt-4 gap-2 text-slate-600">
                  <LogOut className="w-4 h-4" /> Log Out
                </Button>

                <button
                  onClick={() => setShowPinModal(true)}
                  className="absolute bottom-0 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Admin Access
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Back button */}
                {/* Admin Mode Banner */}
                <div className="flex items-center justify-between bg-red-600 text-white rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-bold">Admin Mode: ACTIVE</span>
                  </div>
                  <button
                    onClick={() => { setIsAdminLoggedIn(false); setIsAdmin(false); }}
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Exit
                  </button>
                </div>

                <Button variant="outline" onClick={() => base44.auth.logout()} className="w-full gap-2 text-slate-600">
                  <LogOut className="w-4 h-4" /> Log Out
                </Button>

                {/* Admin Control Panel */}
                <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <h2 className="font-bold text-slate-900 text-base">Admin Control Panel</h2>
                  </div>
                  <p className="text-xs text-slate-500 -mt-2">Assign daily shifts to the roster.</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={adminForm.date}
                        onChange={e => setAdminForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Employee</label>
                      <select
                        value={adminForm.employee}
                        onChange={e => setAdminForm(f => ({ ...f, employee: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="">Select employee</option>
                        {EMPLOYEES.map(emp => (
                          <option key={emp.value} value={String(emp.value)}>{emp.value}. {emp.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Shift</label>
                      <select
                        value={adminForm.shift}
                        onChange={e => setAdminForm(f => ({ ...f, shift: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="">Select shift</option>
                        <option value="AM">AM Shift</option>
                        <option value="PM">PM Shift</option>
                        <option value="Off">OFF Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Task</label>
                      <input
                        type="text"
                        value={adminForm.task}
                        onChange={e => setAdminForm(f => ({ ...f, task: e.target.value }))}
                        placeholder="e.g., Online Chat, Upselling"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    <Button
                      className="w-full h-11 font-semibold text-sm"
                      onClick={handleAdminSave}
                      disabled={adminSaving}
                    >
                      {adminSaving ? "Saving…" : "Save Assignment"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* PIN Modal */}
      {showPinModal && (
        <AdminPinModal
          onClose={() => setShowPinModal(false)}
          onSuccess={() => { setShowPinModal(false); setIsAdminLoggedIn(true); setIsAdmin(true); }}
        />
      )}

      {/* ── FIXED BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {[
            { id: "booking", label: "Booking", icon: CalendarDays },
            { id: "roster", label: "Roster", icon: ClipboardList },
            { id: "profile", label: "Profile", icon: UserCircle },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}