/**
 * Submission Success Modal
 * 
 * This component displays a success message after form submission,
 * including details about the submission and next steps.
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
import { CheckCircle } from 'lucide-react';

export interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  details: string[] | string;
  actionText?: string;
}

export function SubmissionSuccessModal({
  open,
  onClose,
  title,
  details,
  actionText = 'Continue'
}: SubmissionSuccessModalProps) {
  // Format details to always be an array
  const detailsArray = Array.isArray(details) ? details : [details];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {detailsArray.map((detail, index) => (
            <DialogDescription key={index} className="my-2">
              {detail}
            </DialogDescription>
          ))}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>{actionText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionSuccessModal;