import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatBruneiTime } from "@/lib/bruneiTime";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export default function AdminAnnouncement({ adminName }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPopup, setIsPopup] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editIsPopup, setEditIsPopup] = useState(false);
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
  });

  const allAnnouncements = announcements.filter(
    a => Date.now() - new Date(a.created_date).getTime() < TWENTY_FOUR_HOURS * 7
  );

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? u.full_name || u.email : userId;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await base44.entities.Announcement.create({
      subject: subject.trim() || undefined,
      message: message.trim(),
      created_by_name: adminName || "Admin",
      isPopup,
      targetUserId: targetUserId || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    setSubject("");
    setMessage("");
    setIsPopup(false);
    setTargetUserId("");
    setSending(false);
    toast.success("Announcement sent!");
  };

  const handleDelete = async (id) => {
    await base44.entities.Announcement.delete(id);
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    toast.success("Announcement deleted.");
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditSubject(a.subject || "");
    setEditValue(a.message);
    setEditIsPopup(!!a.isPopup);
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) return;
    await base44.entities.Announcement.update(id, {
      subject: editSubject.trim() || undefined,
      message: editValue.trim(),
      isPopup: editIsPopup,
    });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    setEditingId(null);
    toast.success("Announcement updated.");
  };

  const sendLabel = targetUserId
    ? `Send to ${getUserName(targetUserId)}`
    : "Send to All Agents";

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      {/* Compose */}
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-blue-500" />
        <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">Broadcast Announcement</p>
      </div>

      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject (optional)"
        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type your announcement here…"
        rows={3}
        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
      />

      {/* Send To dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Send To</label>
        <select
          value={targetUserId}
          onChange={e => setTargetUserId(e.target.value)}
          className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">🌐 All Users (Global Broadcast)</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              👤 {u.full_name || u.email}
            </option>
          ))}
        </select>
      </div>

      {/* Pop-up toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div
          onClick={() => setIsPopup(v => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPopup ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-700"}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isPopup ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Send as Pop-Up Alert <span className="text-orange-500">📢</span>
        </span>
      </label>

      <Button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="w-full h-9 text-sm font-semibold gap-2"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? "Sending…" : sendLabel}
      </Button>

      {/* Existing announcements */}
      {allAnnouncements.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Announcements</p>
          {allAnnouncements.map(a => {
            const expired = Date.now() - new Date(a.created_date).getTime() >= TWENTY_FOUR_HOURS;
            const targetLabel = a.targetUserId ? `→ ${getUserName(a.targetUserId)}` : "→ All";
            return (
              <div key={a.id} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${expired ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60" : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"}`}>
                {editingId === a.id ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        placeholder="Subject (optional)"
                        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        rows={2}
                        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                      />
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          onClick={() => setEditIsPopup(v => !v)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editIsPopup ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-700"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editIsPopup ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Pop-Up Alert 📢</span>
                      </label>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => saveEdit(a.id)} className="text-blue-500 hover:text-blue-700 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {a.subject && <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{a.subject}</p>}
                        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{a.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {a.isPopup && (
                          <span className="text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-700">
                            POP-UP
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${a.targetUserId ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-700" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600"}`}>
                          {targetLabel}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {expired && <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">Expired</span>}
                    <span className="text-[10px] text-muted-foreground">{formatBruneiTime(a.created_date)}</span>
                  </div>
                  {editingId !== a.id && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(a)} className="text-slate-400 hover:text-blue-500 transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}