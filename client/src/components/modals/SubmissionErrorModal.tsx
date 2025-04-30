/**
 * Submission Error Modal
 * 
 * This component displays a modal when a form submission fails.
 * It shows the error message and provides options to retry or cancel.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export interface SubmissionErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  details: string;
  onRetry?: () => void;
}

export function SubmissionErrorModal({
  open,
  onClose,
  title,
  details,
  onRetry
}: SubmissionErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="pt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-left">
              <p className="text-sm text-gray-700">{details}</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center gap-2 sm:justify-center">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onRetry && (
            <Button variant="default" onClick={onRetry}>
              Retry Submission
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionErrorModal;