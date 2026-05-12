import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SLOTS, getBookableDates, formatDate, isBookingOpen } from "@/lib/slots";
import SlotCard from "@/components/booking/SlotCard";
import DateTab from "@/components/booking/DateTab";
import MySchedule from "@/components/booking/MySchedule";
import { Coffee, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const dates = getBookableDates(); // now 7 days
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    setSelectedDate(dates[0]);
  }, []);

  // Fetch all bookings for the selected date
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: () =>
      selectedDate ? base44.entities.Booking.filter({ date: selectedDate }) : [],
    enabled: !!selectedDate,
  });

  // Fetch ALL bookings for this week (for My Schedule section)
  const { data: weekBookings = [] } = useQuery({
    queryKey: ["bookings-week", dates[0]],
    queryFn: () => base44.entities.Booking.list(),
    enabled: !!user,
  });

  // Real-time subscription for selected date
  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week", dates[0]] });
    });
    return unsub;
  }, [selectedDate]);

  // Create booking with optimistic update
  const createMutation = useMutation({
    mutationFn: (slot) =>
      base44.entities.Booking.create({
        date: selectedDate,
        slot_id: slot.id,
        slot_label: slot.label,
        shift: slot.shift,
        user_email: user.email,
        user_name: user.full_name,
      }),
    onMutate: async (slot) => {
      await queryClient.cancelQueries({ queryKey: ["bookings", selectedDate] });
      const prev = queryClient.getQueryData(["bookings", selectedDate]);
      // Optimistically add the booking
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

  // Cancel booking with optimistic update
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

  const amSlots = SLOTS.filter((s) => s.shift === "AM");
  const pmSlots = SLOTS.filter((s) => s.shift === "PM");

  const getBookedCount = (slotId) =>
    bookings.filter((b) => b.slot_id === slotId).length;

  const getMyBooking = (slotId) =>
    bookings.find((b) => b.slot_id === slotId && b.user_email === user?.email);

  const isMutating = createMutation.isPending || cancelMutation.isPending;

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">TS Booking Slot</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {user ? `Hi, ${user.full_name?.split(" ")[0] || user.email}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 7-day Date picker */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Select Date
          </p>
          <div className="grid grid-cols-7 gap-2">
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

        {/* Daily Master Schedule */}
        <MySchedule bookings={bookings} selectedDate={selectedDate} />

        {/* Selected date info */}
        {selectedDate && (
          <h2 className="font-semibold text-foreground text-lg">
            {formatDate(selectedDate)}
          </h2>
        )}

        {/* Booking closed notice */}
        {selectedDate && !isBookingOpen(selectedDate) && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
            <span className="text-base">🔒</span>
            <div>
              <p className="font-semibold">Booking not open yet</p>
              <p className="text-xs mt-0.5 text-amber-600">
                Bookings for {formatDate(selectedDate)} open at 7:30 PM the evening before.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* AM Shift */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🌤</span>
                <p className="text-sm font-semibold text-foreground">AM Shift</p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {amSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    bookedCount={getBookedCount(slot.id)}
                    myBooking={getMyBooking(slot.id)}
                    onBook={handleBook}
                    onCancel={handleCancel}
                    bookingOpen={isBookingOpen(selectedDate)}
                    loading={isMutating}
                  />
                ))}
              </div>
            </section>

            {/* PM Shift */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🌆</span>
                <p className="text-sm font-semibold text-foreground">PM Shift</p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {pmSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    bookedCount={getBookedCount(slot.id)}
                    myBooking={getMyBooking(slot.id)}
                    onBook={handleBook}
                    onCancel={handleCancel}
                    bookingOpen={isBookingOpen(selectedDate)}
                    loading={isMutating}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}