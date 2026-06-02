import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

function VipRow({ booking, currentUserId, isAdmin, onDeleted }) {
  const isMe = booking.user_id === currentUserId || booking.user_email === currentUserId?.email;
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const name = booking.user_name || (booking.user_email ? booking.user_email.split("@")[0] : "Someone");

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Booking.delete(booking.id);
    onDeleted(booking.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 ${isMe ? "ring-1 ring-blue-300 dark:ring-blue-700" : ""}`}
    >
      <span className="text-base">👑</span>
      <span className="flex-1 text-foreground">
        <strong>{name}</strong>
        {isMe && <span className="ml-1 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">YOU</span>}
        {" "}
        <span className="text-purple-600 dark:text-purple-400 font-semibold">booked with VIP early access</span>
        {booking.slot_label && <span className="text-muted-foreground"> · {booking.slot_label}</span>}
      </span>
      {isAdmin && !confirmDel && (
        <button onClick={() => setConfirmDel(true)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {isAdmin && confirmDel && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleDelete} disabled={deleting} className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded disabled:opacity-50">
            {deleting ? "…" : "Del"}
          </button>
          <button onClick={() => setConfirmDel(false)} className="text-[9px] text-slate-500 hover:text-slate-700 font-semibold">✕</button>
        </div>
      )}
    </motion.div>
  );
}

export default function VipActivityFeed({ user, isAdmin }) {
  const [feed, setFeed] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    base44.entities.Booking.filter({ vip_used: true }, "-created_date", 3).then((bookings) => {
      setFeed(bookings.slice(0, 3));
    });
    const unsub = base44.entities.Booking.subscribe((event) => {
      if (event.type === "create" && event.data?.vip_used) {
        setFeed((prev) => [event.data, ...prev].slice(0, 3));
      }
    });
    return unsub;
  }, []);

  const handleViewAll = async () => {
    if (showAll) { setShowAll(false); return; }
    setLoadingAll(true);
    const all = await base44.entities.Booking.filter({ vip_used: true }, "-created_date", 500);
    if (isAdmin) {
      setAllBookings(all);
    } else {
      const todayStr = new Date().toLocaleDateString("en-CA");
      setAllBookings(all.filter((b) => {
        const d = b.created_date ? new Date(b.created_date).toLocaleDateString("en-CA") : null;
        return d === todayStr;
      }));
    }
    setLoadingAll(false);
    setShowAll(true);
  };

  const handleDeleted = (id) => {
    setFeed((prev) => prev.filter((b) => b.id !== id));
    setAllBookings((prev) => prev.filter((b) => b.id !== id));
  };

  if (feed.length === 0) return null;

  const displayList = showAll ? allBookings : feed;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">🔴 Live VIP Activity</p>
        <button
          onClick={handleViewAll}
          disabled={loadingAll}
          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {loadingAll ? "Loading…" : showAll ? "Show Recent" : "View All"}
        </button>
      </div>
      <div className={`space-y-1.5 ${showAll ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
        <AnimatePresence initial={false}>
          {displayList.map((booking) => (
            <VipRow
              key={booking.id}
              booking={booking}
              currentUserId={user}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </AnimatePresence>
        {showAll && allBookings.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No VIP activity yet.</p>
        )}
      </div>
    </div>
  );
}