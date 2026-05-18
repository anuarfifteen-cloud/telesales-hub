import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export default function AdminAnnouncement({ adminName }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50),
  });

  const allAnnouncements = announcements.filter(
    a => Date.now() - new Date(a.created_date).getTime() < TWENTY_FOUR_HOURS * 7 // show last 7 days for admin
  );

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await base44.entities.Announcement.create({
      message: message.trim(),
      created_by_name: adminName || "Admin",
    });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    setMessage("");
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
    setEditValue(a.message);
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) return;
    await base44.entities.Announcement.update(id, { message: editValue.trim() });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    setEditingId(null);
    toast.success("Announcement updated.");
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      {/* Compose */}
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-blue-500" />
        <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">Broadcast Announcement</p>
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type your announcement here…"
        rows={3}
        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="w-full h-9 text-sm font-semibold gap-2"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? "Sending…" : "Send to All Agents"}
      </Button>

      {/* Existing announcements */}
      {allAnnouncements.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Announcements</p>
          {allAnnouncements.map(a => {
            const expired = Date.now() - new Date(a.created_date).getTime() >= TWENTY_FOUR_HOURS;
            return (
              <div key={a.id} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${expired ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60" : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"}`}>
                {editingId === a.id ? (
                  <div className="flex items-start gap-2">
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      rows={2}
                      className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => saveEdit(a.id)} className="text-blue-500 hover:text-blue-700 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{a.message}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {expired && <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">Expired</span>}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                    </span>
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