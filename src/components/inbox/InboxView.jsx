import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import ChatThread from "./ChatThread";
import UserPicker from "./UserPicker";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initialsOf(name, email) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email?.[0] || "?").toUpperCase();
}

function Avatar({ name, email }) {
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
      <span className="text-sm font-bold text-white">{initialsOf(name, email)}</span>
    </div>
  );
}

export default function InboxView({ user }) {
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | thread | picker
  const [activePeer, setActivePeer] = useState(null); // { id, name }

  // ── FIX: Use two filtered queries instead of .list() to respect RLS ──
  const loadMessages = async () => {
    if (!user?.id) return;
    const [sent, received] = await Promise.all([
      base44.entities.Message.filter({ sender_id: user.id }),
      base44.entities.Message.filter({ recipient_id: user.id }),
    ]);
    // Merge and deduplicate by id (a message you sent to yourself would appear twice)
    const merged = [...sent, ...received];
    const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());
    // Sort newest first
    unique.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setMessages(unique);
  };

  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      try {
        const [users] = await Promise.all([
          base44.entities.User.list(),
          loadMessages(),
        ]);
        setAllUsers(Array.isArray(users) ? users : []);
      } catch (e) {
        console.error("InboxView init error:", e);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Subscribe for real-time updates
    const unsub = base44.entities.Message.subscribe(() => loadMessages());
    return unsub;
  }, [user?.id]);

  const conversations = useMemo(() => {
    if (!user) return [];
    const map = {};
    messages.forEach((m) => {
      const isMine = m.sender_id === user.id;
      const peerId = isMine ? m.recipient_id : m.sender_id;
      const peerName = isMine ? m.recipient_name : m.sender_name;
      const cid = m.conversation_id;
      if (!map[cid]) {
        map[cid] = { conversation_id: cid, peerId, peerName, last: m, unread: 0 };
      }
      const c = map[cid];
      if (new Date(m.created_date) > new Date(c.last.created_date)) c.last = m;
      if (m.recipient_id === user.id && !m.read) c.unread++;
    });
    return Object.values(map).sort(
      (a, b) => new Date(b.last.created_date) - new Date(a.last.created_date)
    );
  }, [messages, user]);

  const resolveName = (peerId, fallback) => {
    const live = allUsers.find((u) => u.id === peerId);
    return live?.full_name || fallback || live?.email || "Unknown";
  };

  // ── Thread view ──
  if (view === "thread" && activePeer) {
    return (
      <ChatThread
        user={user}
        peer={activePeer}
        messages={messages}
        onBack={() => { setView("list"); setActivePeer(null); }}
        onChanged={loadMessages}
      />
    );
  }

  // ── User picker view ──
  if (view === "picker") {
    return (
      <UserPicker
        user={user}
        allUsers={allUsers}
        onBack={() => setView("list")}
        onSelect={(u) => {
          setActivePeer({ id: u.id, name: u.full_name || u.email });
          setView("thread");
        }}
      />
    );
  }

  // ── Inbox list view ──
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-slate-800 dark:text-gray-100">💬 Inbox</h3>
        <button
          onClick={() => setView("picker")}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center gap-2 text-center">
          <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-gray-300">No messages yet</p>
          <p className="text-xs text-muted-foreground">Tap "New" to start a conversation.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => {
            const name = resolveName(c.peerId, c.peerName);
            const liveUser = allUsers.find((u) => u.id === c.peerId);
            const preview = (c.last.sender_id === user.id ? "You: " : "") + c.last.body;
            return (
              <button
                key={c.conversation_id}
                onClick={() => { setActivePeer({ id: c.peerId, name }); setView("thread"); }}
                className="w-full bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Avatar name={name} email={liveUser?.email} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-100 truncate">{name}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {timeAgo(c.last.created_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={`text-xs truncate ${c.unread > 0 ? "text-slate-700 dark:text-gray-200 font-semibold" : "text-muted-foreground"}`}>
                      {preview}
                    </span>
                    {c.unread > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 flex-shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}