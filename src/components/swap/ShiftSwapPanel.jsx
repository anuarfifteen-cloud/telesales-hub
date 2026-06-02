import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ArrowRightLeft, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SLOTS, getAmSlots, isFriday } from "@/lib/slots";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(dateStr) {
  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  return dateStr;
}

// ── New Request Form ──────────────────────────────────────────────────────────
function NewRequestForm({ user, myBookings, allBookings, onCreated, onCancel }) {
  const [mySlot, setMySlot] = useState("");
  const [wantDate, setWantDate] = useState("");
  const [wantSlotId, setWantSlotId] = useState("");
  const [selectedHolderEmail, setSelectedHolderEmail] = useState("");
  const [tokenOffer, setTokenOffer] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const tokens = user?.earlyAccessTokens ?? 0;
  const selectedBooking = myBookings.find((b) => b.id === mySlot);

  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
  const eligibleBookings = myBookings.filter((b) => b.date === today || b.date === tomorrow);

  // Slots available for the chosen "want" date
  const wantSlots = wantDate
    ? [...getAmSlots(wantDate), ...SLOTS.filter((s) => s.shift === "PM")]
    : [];
  const selectedWantSlot = wantSlots.find((s) => s.id === wantSlotId);

  // All people who hold the wanted slot (slots can have 2 bookings)
  const wantSlotHolders = wantDate && wantSlotId
    ? allBookings.filter((b) => b.date === wantDate && b.slot_id === wantSlotId && b.user_email !== user?.email)
    : [];
  // If multiple holders, use the one the user picked; otherwise auto-pick the only one
  const wantSlotHolder = wantSlotHolders.length > 1
    ? (wantSlotHolders.find((h) => h.user_email === selectedHolderEmail) || null)
    : (wantSlotHolders[0] || null);

  const handleSubmit = async () => {
    if (!selectedBooking) { toast.error("Please select a slot to swap."); return; }
    if (!wantDate || !wantSlotId) { toast.error("Please select the slot you want in return."); return; }
    if (!wantSlotHolder) { toast.error("That slot has no one booked yet — nothing to swap."); return; }
    setSaving(true);
    await base44.entities.ShiftSwapRequest.create({
      requester_id: user.id,
      requester_email: user.email,
      requester_name: user.full_name,
      my_date: selectedBooking.date,
      my_slot_label: selectedBooking.slot_label,
      my_slot_id: selectedBooking.slot_id,
      my_shift: selectedBooking.shift,
      target_user_id: wantSlotHolder.created_by_id || "",
      target_user_name: wantSlotHolder.user_name || wantSlotHolder.user_email?.split("@")[0] || "",
      want_date: wantDate,
      want_slot_id: wantSlotId,
      want_slot_label: selectedWantSlot?.label || wantSlotId,
      token_offer: tokenOffer,
      message: message || "",
      status: "open",
    });
    toast.success("Swap request submitted.");
    setSaving(false);
    onCreated();
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <p className="text-xs font-semibold text-foreground mb-0.5">New Slot Swap Request</p>
        <p className="text-[11px] text-muted-foreground">Select a slot you wish to swap. Requests are limited to today and tomorrow.</p>
      </div>

      {/* Slot selector */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your Slot</label>
        {eligibleBookings.length === 0 ? (
          <div className="bg-muted border border-border rounded-lg px-3 py-3 text-xs text-muted-foreground">
            No bookings available for today or tomorrow.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {eligibleBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setMySlot(b.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                  mySlot === b.id
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-xs font-semibold">{formatDate(b.date)} — {b.slot_label}</span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{b.shift}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requested slot */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Slot You Want in Return <span className="text-red-400">*</span></label>
        <div className="flex gap-2 mb-2">
          {[
            { label: "Today", value: today },
            { label: "Tomorrow", value: tomorrow },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setWantDate(value); setWantSlotId(""); setSelectedHolderEmail(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                wantDate === value
                  ? "bg-slate-800 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-300"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {wantDate && (
        <div className="flex flex-col gap-1.5">
        {wantSlots.map((s) => {
          const holders = allBookings.filter((b) => b.date === wantDate && b.slot_id === s.id && b.user_email !== user?.email);
          const isBooked = holders.length > 0;
          const holderNames = holders.map((h) => h.user_name || h.user_email?.split("@")[0]).join(", ");
          return (
            <button
              key={s.id}
              onClick={() => { if (isBooked) { setWantSlotId(s.id); setSelectedHolderEmail(""); } }}
              disabled={!isBooked}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                !isBooked
                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                  : wantSlotId === s.id
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <div>
                <span className="text-xs font-semibold">{s.label}</span>
                {isBooked && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Booked by {holderNames}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isBooked ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {isBooked ? "Booked" : "Empty"}
              </span>
            </button>
          );
        })}
        </div>
        )}
        {!wantDate && (
          <p className="text-[11px] text-muted-foreground">Select Today or Tomorrow above to see available slots.</p>
        )}
        {wantSlotId && wantSlotHolders.length > 1 && (
          <div className="mt-2 bg-muted/60 border border-border rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Choose who to request</p>
            <div className="flex flex-col gap-1.5">
              {wantSlotHolders.map((h) => {
                const name = h.user_name || h.user_email?.split("@")[0];
                const picked = selectedHolderEmail === h.user_email;
                return (
                  <button
                    key={h.user_email}
                    onClick={() => setSelectedHolderEmail(h.user_email)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all ${
                      picked
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-slate-700 dark:text-slate-200">{name?.[0]?.toUpperCase()}</span>
                    </div>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {wantSlotId && wantSlotHolders.length === 1 && (
          <div className="mt-2 flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-foreground">
              Request will be sent to <strong>{wantSlotHolders[0].user_name || wantSlotHolders[0].user_email?.split("@")[0]}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Token incentive */}
      {tokens > 0 && (
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Token Incentive (optional)</label>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].filter((n) => n <= tokens).map((n) => (
              <button
                key={n}
                onClick={() => setTokenOffer(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  tokenOffer === n
                    ? "bg-slate-800 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-300"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {n === 0 ? "None" : `+${n} token${n > 1 ? "s" : ""}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Remarks (optional)</label>
        <input
          type="text"
          placeholder="Add a note…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex gap-2 pt-1 border-t border-border">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !mySlot || !wantDate || !wantSlotId || (wantSlotHolders.length > 1 && !selectedHolderEmail) || (wantSlotHolders.length === 0)}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 disabled:opacity-40 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
        >
          {saving ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

// ── Swap Card ─────────────────────────────────────────────────────────────────
function SwapCard({ req, currentUser, isAdmin, onAccepted, onCancelled, onDeleted }) {
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isMyRequest = req.requester_id === currentUser?.id;
  const isTargetedAtMe = req.target_user_id === currentUser?.id;
  const isBroadcast = !req.target_user_id;
  const canAccept = !isMyRequest && req.status === "open" && (isBroadcast || isTargetedAtMe);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // 1. Fetch both bookings in parallel using precise filters
      const [userABookings, userBBookings] = await Promise.all([
        base44.entities.Booking.filter({ date: req.my_date, slot_id: req.my_slot_id, user_email: req.requester_email }),
        base44.entities.Booking.filter({ date: req.want_date, slot_id: req.want_slot_id, user_email: currentUser.email }),
      ]);

      const userABooking = userABookings[0];
      const userBBooking = userBBookings[0];

      if (!userABooking) {
        toast.error("Could not find the requester's original booking. Swap aborted.");
        setAccepting(false);
        return;
      }
      if (!userBBooking) {
        toast.error("Could not find your booking for that slot. Swap aborted.");
        setAccepting(false);
        return;
      }

      // 2. Swap slot details on both bookings + mark request accepted — all in parallel
      await Promise.all([
        base44.entities.Booking.update(userABooking.id, {
          slot_id: userBBooking.slot_id,
          slot_label: userBBooking.slot_label,
          shift: userBBooking.shift,
        }),
        base44.entities.Booking.update(userBBooking.id, {
          slot_id: userABooking.slot_id,
          slot_label: userABooking.slot_label,
          shift: userABooking.shift,
        }),
        base44.entities.ShiftSwapRequest.update(req.id, {
          status: "accepted",
          accepted_by_id: currentUser.id,
          accepted_by_name: currentUser.full_name,
        }),
      ]);

      // 3. Token transfer (only if tokens were offered) — handled server-side
      if (req.token_offer > 0) {
        const result = await base44.functions.invoke('swapTokenTransfer', {
          requester_id: req.requester_id,
          token_offer: req.token_offer,
        });
        if (!result?.data?.success) {
          throw new Error(result?.data?.error || 'Token transfer failed');
        }
      }

      toast.success(`Swap complete! Slots exchanged${req.token_offer > 0 ? ` and ${req.token_offer} token${req.token_offer > 1 ? "s" : ""} transferred` : ""}.`);
    } catch (err) {
      toast.error("Something went wrong during the swap. Please try again.");
      console.error(err);
    }
    setAccepting(false);
    onAccepted();
  };

  const handleCancel = async () => {
    setCancelling(true);
    await base44.entities.ShiftSwapRequest.update(req.id, { status: "cancelled" });
    toast.success("Request withdrawn.");
    setCancelling(false);
    onCancelled();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.ShiftSwapRequest.delete(req.id);
    toast.success("Request deleted.");
    setDeleting(false);
    onDeleted();
  };

  const statusStyles = {
    open: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    accepted: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    cancelled: "bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700",
  }[req.status];

  const displayName = isMyRequest ? "You" : (req.requester_name || req.requester_email?.split("@")[0] || "Unknown");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-lg border bg-card overflow-hidden ${isTargetedAtMe && req.status === "open" ? "border-primary" : "border-border"}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">
              {(req.requester_name || req.requester_email)?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <span className="text-xs font-semibold text-foreground">{displayName}</span>
          <span className="text-[10px] text-muted-foreground">· {timeAgo(req.created_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
        {isAdmin && !confirmDel && (
          <button onClick={() => setConfirmDel(true)} className="text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        {isAdmin && confirmDel && (
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={deleting} className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded disabled:opacity-50">
              {deleting ? "…" : "Del"}
            </button>
            <button onClick={() => setConfirmDel(false)} className="text-[9px] text-slate-500 hover:text-slate-700 font-semibold">✕</button>
          </div>
        )}
        {isTargetedAtMe && req.status === "open" && (
            <span className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
              Directed to you
            </span>
          )}
          {isBroadcast && req.status === "open" && (
            <span className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Open
            </span>
          )}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusStyles}`}>
            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Slot details */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Offering</p>
          <p className="text-xs font-semibold text-foreground">{formatDate(req.my_date)}</p>
          <p className="text-[11px] text-muted-foreground">{req.my_slot_label} · {req.my_shift}</p>
        </div>
        <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Requesting</p>
          {req.want_date && req.want_slot_label ? (
            <>
              <p className="text-xs font-semibold text-foreground">{formatDate(req.want_date)}</p>
              <p className="text-[11px] text-muted-foreground">{req.want_slot_label}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Any slot</p>
          )}
        </div>
      </div>

      {/* Footer: token offer / message / accepted-by */}
      {(req.token_offer > 0 || req.message || (req.status === "accepted" && req.accepted_by_name)) && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-2 items-center">
          {req.token_offer > 0 && (
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
              +{req.token_offer} token{req.token_offer > 1 ? "s" : ""} offered
            </span>
          )}
          {req.message && (
            <span className="text-[10px] text-muted-foreground italic">"{req.message}"</span>
          )}
          {req.status === "accepted" && req.accepted_by_name && (
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              Accepted by {req.accepted_by_id === currentUser?.id ? "you" : req.accepted_by_name}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {(canAccept || (isMyRequest && req.status === "open")) && (
        <div className="px-3 pb-3 flex gap-2">
          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors disabled:opacity-40"
            >
              {accepting ? "Processing…" : "Accept Swap"}
            </button>
          )}
          {isMyRequest && req.status === "open" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              {cancelling ? "…" : "Withdraw"}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function ShiftSwapPanel({ user, myBookings, onClose, isAdmin }) {
  const [view, setView] = useState("list");
  const [requests, setRequests] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [filter, setFilter] = useState("open");

  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

  const loadData = async () => {
    const [reqs, bookingsToday, bookingsTomorrow] = await Promise.all([
      base44.entities.ShiftSwapRequest.list("-created_date", 50),
      base44.entities.Booking.filter({ date: today }),
      base44.entities.Booking.filter({ date: tomorrow }),
    ]);
    setRequests(reqs);
    setAllBookings([...bookingsToday, ...bookingsTomorrow]);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.ShiftSwapRequest.subscribe(() => loadData());
    return unsub;
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (filter === "mine") return r.requester_id === user?.id;
    if (filter === "open") {
      if (r.status !== "open") return false;
      return !r.target_user_id || r.target_user_id === user?.id;
    }
    return true;
  });

  const openForMe = requests.filter(
    (r) => r.status === "open" && (r.target_user_id === user?.id || (!r.target_user_id && r.requester_id !== user?.id))
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-background w-full max-w-2xl rounded-t-xl shadow-2xl flex flex-col border-t border-x border-border"
        style={{ maxHeight: "88vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Slot Swap Requests</h2>
            {openForMe > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{openForMe}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => setView("new")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> New Request
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {view === "new" ? (
            <NewRequestForm
              user={user}
              myBookings={myBookings}
              allBookings={allBookings}
              onCreated={() => { loadData(); setView("list"); }}
              onCancel={() => setView("list")}
            />
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {/* Filter tabs */}
              <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
                {[
                  { id: "open", label: "Open" },
                  { id: "mine", label: "Mine" },
                  { id: "all", label: "All" },
                ].map(({ id, label }, i, arr) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${
                      i < arr.length - 1 ? "border-r border-border" : ""
                    } ${
                      filter === id
                        ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-2">
                  <ArrowRightLeft className="w-7 h-7 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No requests found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredRequests.map((r) => (
                      <SwapCard
                        key={r.id}
                        req={r}
                        currentUser={user}
                        isAdmin={isAdmin}
                        onAccepted={loadData}
                        onCancelled={loadData}
                        onDeleted={loadData}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}