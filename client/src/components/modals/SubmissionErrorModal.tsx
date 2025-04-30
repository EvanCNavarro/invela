/**
 * Submission Error Modal
 * 
 * This component displays an error message when form submission fails,
 * including details about the error and guidance on how to proceed.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

export interface SubmissionErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  details: string[] | string;
  actionText?: string;
}

export function SubmissionErrorModal({
  open,
  onClose,
  title,
  details,
  actionText = 'Close'
}: SubmissionErrorModalProps) {
  // Format details to always be an array
  const detailsArray = Array.isArray(details) ? details : [details];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {detailsArray.map((detail, index) => (
            <DialogDescription key={index} className="my-2 text-red-600">
              {detail}
            </DialogDescription>
          ))}
          
          <DialogDescription className="mt-4">
            Please try again or contact support if the issue persists.
          </DialogDescription>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{actionText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionErrorModal;