import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AnnouncementPopup({ announcement, onDismiss }) {
  const [isChecked, setIsChecked] = useState(false);

  if (!announcement) return null;

  const handleDismiss = () => {
    // Only allow dismissal if they checked the box
    if (!isChecked) return;
    
    localStorage.setItem(`seen_popup_${announcement.id}`, "true");
    onDismiss();
    setIsChecked(false); // Reset state for next time
  };

  return (
    <AlertDialog open={!!announcement}>
      <AlertDialogContent className="text-center max-w-[400px]">
        <AlertDialogHeader className="items-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mb-1">
            <span className="text-2xl">📢</span>
          </div>
          <AlertDialogTitle className="text-lg text-center">
            {announcement.subject || "Admin Announcement"}
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground leading-relaxed text-center mt-1 whitespace-pre-wrap">
            {announcement.message}
          </p>
        </AlertDialogHeader>

        {/* ── Checkbox Acknowledgement ── */}
        <div className="flex items-center justify-center gap-2 my-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <input
            type="checkbox"
            id="acknowledge-check"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label 
            htmlFor="acknowledge-check" 
            className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
          >
            I have read and understand this notice
          </label>
        </div>

        <AlertDialogFooter className="justify-center sm:justify-center mt-2">
          <button
            disabled={!isChecked}
            onClick={handleDismiss}
            className={`w-full rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors
              ${isChecked 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
              }`}
          >
            Close
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}