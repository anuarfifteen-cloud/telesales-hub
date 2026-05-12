import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SLOTS, getBookableDates, formatDate, isBookingOpen } from "@/lib/slots";
import SlotCard from "@/components/booking/SlotCard";
import DateTab from "@/components/booking/DateTab";
import { Coffee, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const dates = getBookableDates();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    setSelectedDate(dates[0]);
  }, []);

  // Fetch all bookings for the selected date
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: () =>
      selectedDate
        ? base44.entities.Booking.filter({ date: selectedDate })
        : [],
    enabled: !!selectedDate,
  });

  // Create booking
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      toast.success("Break booked successfully!");
    },
    onError: () => toast.error("Failed to book. Please try again."),
  });

  // Cancel booking
  const cancelMutation = useMutation({
    mutationFn: (booking) => base44.entities.Booking.delete(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate] });
      toast.success("Booking cancelled.");
    },
    onError: () => toast.error("Failed to cancel. Please try again."),
  });

  const handleBook = (slot) => {
    if (!user) return;
    // Check if user already has a booking on this date
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

  const myBookingToday = bookings.find((b) => b.user_email === user?.email);

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
              <h1 className="font-bold text-base leading-tight">BreakBook</h1>
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
        {/* Date picker */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Select Date
          </p>
          <div className="flex gap-2">
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

        {/* Selected date info */}
        {selectedDate && (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-lg">
              {formatDate(selectedDate)}
            </h2>
            {myBookingToday && (
              <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
                ✓ Booked: {myBookingToday.slot_label}
              </span>
            )}
          </div>
        )}

        {/* Booking closed notice */}
        {selectedDate && !isBookingOpen(selectedDate) && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
            <span className="text-base">🔒</span>
            <div>
              <p className="font-semibold">Booking not open yet</p>
              <p className="text-xs mt-0.5 text-amber-600">
                Bookings for {formatDate(selectedDate)} open at 7:30 PM the
                evening before.
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