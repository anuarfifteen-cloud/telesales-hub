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
import { Coffee, LogOut, CalendarDays, ClipboardList, UserCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("booking");
  const [innerTab, setInnerTab] = useState("book");
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

  return (
    <div className="min-h-screen bg-background font-inter pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10" style={{ boxShadow: "0 1px 12px 0 rgba(0,0,0,0.08)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: logout */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600 w-9 h-9"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" />
          </Button>

          {/* Center: app title */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <h1 className="text-xl text-slate-900 leading-tight" style={{ fontFamily: "'Pacifico', cursive" }}>Telesales Hub</h1>
            {user && (
              <p className="text-[11px] text-slate-400 leading-tight">
                {user.full_name?.split(" ")[0] || user.email}
              </p>
            )}
          </div>

          {/* Right: bell */}
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors relative">
            <Bell className="w-5 h-5 text-slate-500" />
          </button>
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
                    <section>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🌤</span>
                        <p className="text-sm font-semibold text-foreground">AM Shift</p>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-1.5">
                        {amSlots.map((slot) => (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            bookedCount={getBookedCount(slot.id)}
                            myBooking={getMyBooking(slot.id)}
                            onBook={handleBook}
                            onCancel={handleCancel}
                            unlockTime={unlockTime}
                            now={bruneiNow}
                            loading={isMutating}
                          />
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🌆</span>
                        <p className="text-sm font-semibold text-foreground">PM Shift</p>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-1.5">
                        {pmSlots.map((slot) => (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            bookedCount={getBookedCount(slot.id)}
                            myBooking={getMyBooking(slot.id)}
                            onBook={handleBook}
                            onCancel={handleCancel}
                            unlockTime={unlockTime}
                            now={bruneiNow}
                            loading={isMutating}
                          />
                        ))}
                      </div>
                    </section>
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
        {activeTab === "roster" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">Daily Team Roster</h2>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <UserCircle className="w-12 h-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </div>
        )}
      </main>

      {/* ── FIXED BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {[
            { id: "booking", label: "Booking", icon: CalendarDays },
            { id: "schedule", label: "Roster", icon: ClipboardList },
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