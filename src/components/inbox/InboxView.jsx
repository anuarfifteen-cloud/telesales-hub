import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import moment from "moment";
import ChatThread from "./ChatThread";
import UserPicker from "./UserPicker";

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

  const loadMessages = () =>
    base44.entities.Message.list("-created_date", 500).then((m) => setMessages(m));

  useEffect(() => {
    Promise.all([
      base44.entities.Message.list("-created_date", 500),
      base44.entities.User.list(),
    ]).then(([m, u]) => {
      setMessages(m);
      setAllUsers(u);
      setLoading(false);
    });
    const unsub = base44.entities.Message.subscribe(() => loadMessages());
    return unsub;
  }, []);

  const conversations = useMemo(() => {
    if (!user) return [];
    const map = {};
    messages.forEach((m) => {
      const isMine = m.sender_id === user.id;
      const peerId = isMine ? m.recipient_id : m.sender_id;
      const peerName = isMine ? m.recipient_name : m.sender_name;
      if (!map[m.conversation_id]) {
        map[m.conversation_id] = { conversation_id: m.conversation_id, peerId, peerName, last: m, unread: 0 };
      }
      const c = map[m.conversation_id];
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
          <p className="text-xs text-muted-foreground">Tap “New” to start a conversation.</p>
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
                      {moment(c.last.created_date).fromNow()}
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