/**
 * SubmissionSuccessModal Component
 * 
 * A modal that appears when a form is successfully submitted.
 * Provides feedback and next steps for the user.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  buttonText?: string;
}

export function SubmissionSuccessModal({
  open,
  onClose,
  title,
  description,
  buttonText = 'Continue'
}: SubmissionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="pt-2 text-center max-w-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}