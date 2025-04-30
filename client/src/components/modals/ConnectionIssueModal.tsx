import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface ConnectionIssueModalProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  errorMessage?: string;
}

/**
 * Modal to display when there's a connection issue with the database
 * 
 * This modal provides the user with information about connection issues
 * and gives them options to retry or cancel the operation.
 */
export default function ConnectionIssueModal({
  open,
  onClose,
  onRetry,
  errorMessage = "We're having trouble connecting to the database. This might be due to a temporary connection issue."
}: ConnectionIssueModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Connection Issue</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {errorMessage}
          </AlertDialogDescription>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md text-sm text-muted-foreground">
            <p className="font-medium mb-2">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Try submitting again - many connection issues resolve on their own</li>
              <li>Check your internet connection</li>
              <li>If the problem persists, contact support</li>
            </ul>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRetry} className="bg-primary">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}