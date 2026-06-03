import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trash2, Plus, ChevronDown, ChevronUp, Zap, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format as tzFormat } from "date-fns-tz";

const TZ = "Asia/Brunei";

export default function AdminBookingTotals() {
  const queryClient = useQueryClient();
  const [expandedUser, setExpandedUser] = useState(null);
  const [addingFor, setAddingFor] = useState(null);
  const [newBooking, setNewBooking] = useState({ date: "", slot_id: "", slot_label: "", shift: "AM" });
  const [saving, setSaving] = useState(false);
  const [editingTokensFor, setEditingTokensFor] = useState(null);
  const [tokenEditValue, setTokenEditValue] = useState("");

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["all-bookings-admin"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => base44.entities.User.list(),
  });

  // Group bookings by user email
  const bookingsByUser = allBookings.reduce((acc, b) => {
    if (!acc[b.user_email]) acc[b.user_email] = [];
    acc[b.user_email].push(b);
    return acc;
  }, {});

  // Build user list: merge User entity + booking-only users
  const userEmails = new Set([
    ...users.map(u => u.email),
    ...Object.keys(bookingsByUser),
  ]);

  const userList = Array.from(userEmails).map(email => {
    const userEntity = users.find(u => u.email === email);
    const bookings = bookingsByUser[email] || [];
    return {
      email,
      name: userEntity?.full_name || bookings[0]?.user_name || email,
      userId: userEntity?.id || null,
      tokens: userEntity?.earlyAccessTokens ?? 0,
      bookings,
      total: bookings.length,
    };
  }).sort((a, b) => b.total - a.total);

  const handleSaveTokens = async (userId, newVal) => {
    const parsed = parseInt(newVal, 10);
    if (isNaN(parsed) || parsed < 0) { toast.error("Enter a valid token count."); return; }
    await base44.entities.User.update(userId, { earlyAccessTokens: parsed });
    queryClient.invalidateQueries({ queryKey: ["all-users-admin"] });
    setEditingTokensFor(null);
    toast.success("Tokens updated.");
  };

  const handleDelete = async (bookingId) => {
    try {
      await base44.entities.Booking.delete(bookingId);
      toast.success("Booking removed.");
    } catch {
      toast.error("Booking already removed or not found.");
    } finally {
      queryClient.invalidateQueries({ queryKey: ["all-bookings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-week"] });
    }
  };

  const handleAdd = async (userEmail, userName) => {
    if (!newBooking.date || !newBooking.slot_id) {
      toast.error("Please fill in date and slot ID.");
      return;
    }
    setSaving(true);
    await base44.entities.Booking.create({
      date: newBooking.date,
      slot_id: newBooking.slot_id,
      slot_label: newBooking.slot_label || newBooking.slot_id,
      shift: newBooking.shift,
      user_email: userEmail,
      user_name: userName,
      booked_at: tzFormat(new Date(), "hh:mm:ss.SSS aa", { timeZone: TZ }),
    });
    queryClient.invalidateQueries({ queryKey: ["all-bookings-admin"] });
    queryClient.invalidateQueries({ queryKey: ["bookings-week"] });
    setNewBooking({ date: "", slot_id: "", slot_label: "", shift: "AM" });
    setAddingFor(null);
    setSaving(false);
    toast.success("Booking credit added.");
  };

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">📊 All Users Booking Totals</p>
      <div className="space-y-2">
        {userList.map(({ email, name, bookings, total, tokens, userId }) => {
          const isExpanded = expandedUser === email;
          const isEditingTokens = editingTokensFor === email;
          return (
            <div key={email} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* User Row */}
              <button
                onClick={() => setExpandedUser(isExpanded ? null : email)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-white">
                      {name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />{tokens}
                  </span>
                  <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                    {total} bookings
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </button>

              {/* Expanded Bookings */}
              {isExpanded && (
                <div className="px-3 py-2 space-y-1.5 bg-white dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700">
                  {/* Token Editor */}
                  {userId && (
                    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Early Access Tokens</span>
                      </div>
                      {isEditingTokens ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0" value={tokenEditValue}
                            onChange={e => setTokenEditValue(e.target.value)}
                            className="w-16 text-xs border border-amber-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 text-center"
                            autoFocus
                          />
                          <button onClick={() => handleSaveTokens(userId, tokenEditValue)} className="text-emerald-500 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingTokensFor(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{tokens} tokens</span>
                          <button onClick={e => { e.stopPropagation(); setEditingTokensFor(email); setTokenEditValue(String(tokens)); }} className="text-slate-300 hover:text-amber-500 transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {bookings.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-1">No bookings yet.</p>
                  )}
                  {[...bookings].sort((a, b) => new Date(b.date) - new Date(a.date)).map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{b.date}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{b.slot_label || b.slot_id}</span>
                        <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.shift === "AM" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                          {b.shift}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Booking */}
                  {addingFor === email ? (
                    <div className="border border-dashed border-blue-300 rounded-lg p-2.5 space-y-2 bg-blue-50 dark:bg-blue-950/20">
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Add Booking Credit</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={newBooking.date} onChange={e => setNewBooking(f => ({ ...f, date: e.target.value }))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 col-span-2" />
                        <input type="text" value={newBooking.slot_id} onChange={e => setNewBooking(f => ({ ...f, slot_id: e.target.value }))}
                          placeholder="Slot ID (e.g. AM1)" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="text" value={newBooking.slot_label} onChange={e => setNewBooking(f => ({ ...f, slot_label: e.target.value }))}
                          placeholder="Label (optional)" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <select value={newBooking.shift} onChange={e => setNewBooking(f => ({ ...f, shift: e.target.value }))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleAdd(email, name)} disabled={saving}>
                          {saving ? "Saving…" : "Add"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingFor(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingFor(email); setNewBooking({ date: "", slot_id: "", slot_label: "", shift: "AM" }); }}
                      className="w-full flex items-center justify-center gap-1 text-xs text-blue-500 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-dashed border-blue-200 transition-colors">
                      <Plus className="w-3 h-3" /> Add Booking Credit
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}