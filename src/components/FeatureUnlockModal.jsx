import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FeatureUnlockModal({ isOpen, onClose, title, message }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="text-center">
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-xl text-center">{title}</AlertDialogTitle>
          <p className="text-sm text-muted-foreground leading-relaxed text-center mt-1">{message}</p>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center sm:justify-center mt-2">
          <button
            onClick={onClose}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
          >
            Awesome! 🎉
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}