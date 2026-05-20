import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AnnouncementPopup({ announcement, onDismiss }) {
  if (!announcement) return null;

  const handleDismiss = () => {
    localStorage.setItem(`seen_popup_${announcement.id}`, "true");
    onDismiss();
  };

  return (
    <AlertDialog open={!!announcement} onOpenChange={handleDismiss}>
      <AlertDialogContent className="text-center">
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
        <AlertDialogFooter className="justify-center sm:justify-center mt-2">
          <button
            onClick={handleDismiss}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}