import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send } from "lucide-react";

function convId(a, b) {
  return [a, b].sort().join("_");
}

function initialsOf(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Brunei",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ChatThread({ user, peer, messages, onBack, onChanged }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const markedRef = useRef(new Set());
  const cid = convId(user.id, peer.id);

  const threadMessages = messages
    .filter((m) => m.conversation_id === cid)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  // Mark unread incoming messages as read
  useEffect(() => {
    const unread = threadMessages.filter(
      (m) => m.recipient_id === user.id && !m.read && !markedRef.current.has(m.id)
    );
    if (unread.length === 0) return;
    unread.forEach((m) => markedRef.current.add(m.id));
    Promise.all(
      unread.map((m) => base44.entities.Message.update(m.id, { read: true }))
    ).then(() => onChanged && onChanged());
  }, [threadMessages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        conversation_id: cid,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        recipient_id: peer.id,
        recipient_name: peer.name,
        body,
        read: false,
      });
      setText("");
      onChanged && onChanged();
    } catch (err) {
      console.error("Send failed:", err);
      const msg = err?.message || err?.toString() || "Unknown error";
      alert(`Failed to send message: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden" style={{ height: "70vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border flex-shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">{initialsOf(peer.name)}</span>
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-gray-100 truncate">{peer.name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-900/40">
        {threadMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          threadMessages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                  mine
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-gray-100 border border-border rounded-bl-sm"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[9px] mt-0.5 ${mine ? "text-blue-100" : "text-muted-foreground"}`}>
                    {formatTime(m.created_date)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border flex-shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
          placeholder="Type a message…"
          className="flex-1 text-sm border border-border rounded-full px-4 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}