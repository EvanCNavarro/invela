import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ConnectionIssueModalProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  errorMessage?: string;
}

export default function ConnectionIssueModal({
  open,
  onClose,
  onRetry,
  errorMessage = "We're having trouble connecting to our servers. This might be due to a temporary connection issue."
}: ConnectionIssueModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mb-4">
            <AlertCircle className="h-10 w-10 text-amber-600" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Connection Issue</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {errorMessage}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 my-4">
          <p className="text-sm text-slate-700">
            Don't worry - your data has been saved locally. You can try submitting again or continue working and submit later.
          </p>
        </div>
        
        <DialogFooter className="sm:justify-center flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Continue Working
          </Button>
          <Button onClick={onRetry} className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Retry Submission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Named export for component
export { ConnectionIssueModal };