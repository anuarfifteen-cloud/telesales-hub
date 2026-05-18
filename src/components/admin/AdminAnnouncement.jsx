import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminAnnouncement({ adminName }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

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

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
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
    </div>
  );
}