import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
}

/**
 * Standardized Success Modal for form submissions
 * 
 * This component provides a consistent success experience across
 * all form types: KYB, KY3P, and Open Banking
 */
export function SubmissionSuccessModal({
  open,
  onClose,
  title = 'Form Submitted',
  description = 'Your form has been successfully submitted.',
  buttonText = 'Close'
}: SubmissionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-xl text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center mt-4">
          <Button onClick={onClose}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}