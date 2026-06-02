import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ArrowRightLeft, Coins, Users, Megaphone } from "lucide-react";
import { toast } from "sonner";

// ── Helper ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── New Request Form ──────────────────────────────────────────────────────────
function NewRequestForm({ user, myBookings, users, onCreated, onCancel }) {
  const [mySlot, setMySlot] = useState("");
  const [targetMode, setTargetMode] = useState("broadcast"); // broadcast | targeted
  const [targetUserId, setTargetUserId] = useState("");
  const [wantDate, setWantDate] = useState("");
  const [wantSlot, setWantSlot] = useState("");
  const [tokenOffer, setTokenOffer] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const tokens = user?.earlyAccessTokens ?? 0;

  const selectedBooking = myBookings.find((b) => b.id === mySlot);
  const targetUser = users.find((u) => u.id === targetUserId);

  const handleSubmit = async () => {
    if (!selectedBooking) { toast.error("Select a slot to offer."); return; }
    if (tokenOffer > tokens) { toast.error("Not enough tokens."); return; }
    setSaving(true);

    await base44.entities.ShiftSwapRequest.create({
      requester_id: user.id,
      requester_email: user.email,
      requester_name: user.full_name,
      my_date: selectedBooking.date,
      my_slot_label: selectedBooking.slot_label,
      my_slot_id: selectedBooking.slot_id,
      my_shift: selectedBooking.shift,
      target_user_id: targetMode === "targeted" ? targetUserId : "",
      target_user_name: targetMode === "targeted" ? (targetUser?.full_name || "") : "",
      want_date: wantDate || "",
      want_slot_label: wantSlot || "",
      token_offer: tokenOffer,
      message: message || "",
      status: "open",
    });

    toast.success("Swap request posted!");
    setSaving(false);
    onCreated();
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="font-bold text-foreground text-sm">📤 Post a Swap Request</h3>

      {/* My slot to offer */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Your slot to swap away</label>
        {myBookings.length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">You have no upcoming bookings to swap.</p>
        ) : (
          <select
            value={mySlot}
            onChange={(e) => setMySlot(e.target.value)}
            className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Choose a slot —</option>
            {myBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.date} · {b.slot_label} ({b.shift})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Broadcast or target */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Send to</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTargetMode("broadcast")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
              targetMode === "broadcast" ? "bg-blue-600 text-white border-blue-500" : "bg-muted border-border text-muted-foreground"
            }`}
          >
            <Megaphone className="w-3 h-3" /> Everyone
          </button>
          <button
            onClick={() => setTargetMode("targeted")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
              targetMode === "targeted" ? "bg-purple-600 text-white border-purple-500" : "bg-muted border-border text-muted-foreground"
            }`}
          >
            <Users className="w-3 h-3" /> Specific Person
          </button>
        </div>
        {targetMode === "targeted" && (
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full mt-2 text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Select person —</option>
            {users.filter((u) => u.id !== user.id).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* What you want in return (optional) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Want date (optional)</label>
          <input
            type="date"
            value={wantDate}
            onChange={(e) => setWantDate(e.target.value)}
            className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Want slot (optional)</label>
          <input
            type="text"
            placeholder="e.g. PM any"
            value={wantSlot}
            onChange={(e) => setWantSlot(e.target.value)}
            className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Token offer */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
          <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-3 h-3" />
          Token sweetener (you have {tokens})
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={tokens}
            value={tokenOffer}
            onChange={(e) => setTokenOffer(Math.min(Math.max(0, parseInt(e.target.value) || 0), tokens))}
            className="w-20 text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {[0, 1, 2, 3].filter((n) => n <= tokens).map((n) => (
            <button
              key={n}
              onClick={() => setTokenOffer(n)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                tokenOffer === n ? "bg-amber-500 border-amber-400 text-white" : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {n === 0 ? "None" : `+${n}`}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Note (optional)</label>
        <input
          type="text"
          placeholder="e.g. Need PM on Friday…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-border bg-muted text-muted-foreground">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !mySlot}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
        >
          {saving ? "Posting…" : "Post Request"}
        </button>
      </div>
    </div>
  );
}

// ── Single Swap Card ──────────────────────────────────────────────────────────
function SwapCard({ req, currentUser, onAccepted, onCancelled }) {
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isMyRequest = req.requester_id === currentUser?.id;
  const isTargetedAtMe = req.target_user_id === currentUser?.id;
  const isBroadcast = !req.target_user_id;
  const canAccept = !isMyRequest && req.status === "open" && (isBroadcast || isTargetedAtMe);

  const handleAccept = async () => {
    setAccepting(true);
    await base44.entities.ShiftSwapRequest.update(req.id, {
      status: "accepted",
      accepted_by_id: currentUser.id,
      accepted_by_name: currentUser.full_name,
    });
    toast.success("Swap accepted! Coordinate with the other person to complete it.");
    setAccepting(false);
    onAccepted();
  };

  const handleCancel = async () => {
    setCancelling(true);
    await base44.entities.ShiftSwapRequest.update(req.id, { status: "cancelled" });
    toast.success("Request cancelled.");
    setCancelling(false);
    onCancelled();
  };

  const statusBadge = {
    open: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    accepted: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
  }[req.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-xl border p-3 flex flex-col gap-2 ${
        isTargetedAtMe && req.status === "open"
          ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30"
          : "border-border bg-card"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">
              {(req.requester_name || req.requester_email)?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">
              {isMyRequest ? "You" : (req.requester_name || req.requester_email?.split("@")[0])}
            </p>
            <p className="text-[10px] text-muted-foreground">{timeAgo(req.created_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isTargetedAtMe && req.status === "open" && (
            <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-700">
              👑 For You
            </span>
          )}
          {!req.target_user_id && req.status === "open" && (
            <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
              📢 Open
            </span>
          )}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusBadge}`}>
            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Swap details */}
      <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold">OFFERING</p>
          <p className="text-xs font-bold text-foreground truncate">{req.my_date} · {req.my_slot_label}</p>
          <p className="text-[10px] text-muted-foreground">{req.my_shift} Shift</p>
        </div>
        <ArrowRightLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] text-muted-foreground font-semibold">WANTS</p>
          {req.want_date || req.want_slot_label ? (
            <>
              <p className="text-xs font-bold text-foreground truncate">{req.want_date || "Any date"}</p>
              <p className="text-[10px] text-muted-foreground">{req.want_slot_label || "Any slot"}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Any slot</p>
          )}
        </div>
      </div>

      {/* Token offer + message */}
      <div className="flex items-center gap-2 flex-wrap">
        {req.token_offer > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
            <img src="https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png" alt="token" className="w-3 h-3" />
            +{req.token_offer} token{req.token_offer > 1 ? "s" : ""} sweetener
          </span>
        )}
        {req.target_user_name && !isTargetedAtMe && (
          <span className="text-[10px] text-muted-foreground">→ {req.target_user_name}</span>
        )}
        {req.message && (
          <span className="text-[10px] text-muted-foreground italic truncate">"{req.message}"</span>
        )}
      </div>

      {/* Accepted by */}
      {req.status === "accepted" && req.accepted_by_name && (
        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
          ✅ Accepted by {req.accepted_by_id === currentUser?.id ? "You" : req.accepted_by_name}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {canAccept && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40"
          >
            {accepting ? "Accepting…" : "✅ Accept Swap"}
          </button>
        )}
        {isMyRequest && req.status === "open" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
          >
            {cancelling ? "…" : "Cancel Request"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function ShiftSwapPanel({ user, myBookings, onClose }) {
  const [view, setView] = useState("list"); // list | new
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("open"); // open | mine | all

  const loadData = async () => {
    const [reqs, allUsers] = await Promise.all([
      base44.entities.ShiftSwapRequest.list("-created_date", 50),
      base44.entities.User.list(),
    ]);
    setRequests(reqs);
    setUsers(allUsers);
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
      // Show broadcasts + requests targeted at me
      return !r.target_user_id || r.target_user_id === user?.id;
    }
    return true; // all
  });

  const openForMe = requests.filter(
    (r) => r.status === "open" && (r.target_user_id === user?.id || (!r.target_user_id && r.requester_id !== user?.id))
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-background w-full max-w-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Shift Swap Market</h2>
            {openForMe > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{openForMe}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "new" ? "list" : "new")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === "new" ? "bg-red-100 text-red-600" : "bg-blue-600 text-white"
              }`}
            >
              {view === "new" ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {view === "new" ? "Cancel" : "New Request"}
            </button>
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
              users={users}
              onCreated={() => { loadData(); setView("list"); }}
              onCancel={() => setView("list")}
            />
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {/* Filter tabs */}
              <div className="flex gap-1 bg-muted rounded-xl p-1">
                {[
                  { id: "open", label: "Open" },
                  { id: "mine", label: "My Requests" },
                  { id: "all", label: "All" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filter === id ? "bg-background shadow text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-10">
                  <ArrowRightLeft className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No swap requests here.</p>
                  <p className="text-xs text-muted-foreground mt-1">Post one to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredRequests.map((r) => (
                      <SwapCard
                        key={r.id}
                        req={r}
                        currentUser={user}
                        onAccepted={loadData}
                        onCancelled={loadData}
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