/**
 * Submission Success Modal
 * 
 * This component displays a modal when a form is successfully submitted.
 * It shows details about what was accomplished and unlocked.
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
import { CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  details: string[];
  returnPath?: string;
  returnLabel?: string;
}

export function SubmissionSuccessModal({
  open,
  onClose,
  title,
  details,
  returnPath,
  returnLabel = 'Return to Dashboard'
}: SubmissionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="pt-4">
            <div className="space-y-2">
              {details.map((detail, index) => (
                <p key={index} className="text-sm text-left">
                  • {detail}
                </p>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center gap-2 sm:justify-center">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          {returnPath && (
            <Button variant="outline" asChild>
              <Link href={returnPath}>
                {returnLabel}
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionSuccessModal;