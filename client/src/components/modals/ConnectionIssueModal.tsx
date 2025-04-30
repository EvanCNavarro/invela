/**
 * ConnectionIssueModal Component
 * 
 * A modal that appears when there's a database connection issue during form submission.
 * Provides information about the error and offers retry options.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface ConnectionIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  retryCount: number;
  formType: string;
  error?: Error | null;
}

export function ConnectionIssueModal({
  isOpen,
  onClose,
  onRetry,
  retryCount,
  formType,
  error
}: ConnectionIssueModalProps) {
  const [, navigate] = useLocation();
  const formTypeName = formType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const returnToTaskCenter = () => {
    navigate('/task-center');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-amber-600" />
          </div>
          <DialogTitle className="text-xl">Connection Issue</DialogTitle>
          <DialogDescription className="pt-2 text-center max-w-sm">
            We're having trouble connecting to our database to submit your {formTypeName} form. 
            <strong className="block mt-2">Your progress is saved</strong> and you can try again.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-24 overflow-y-auto">
            <p className="font-mono text-xs">{error.message}</p>
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 my-2">
          <p>
            <strong>What to do:</strong> You can either retry submitting now, or return to the Task Center 
            and try again later. Your form data is saved.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={returnToTaskCenter}
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Task Center
          </Button>
          <Button 
            onClick={onRetry} 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Submission {retryCount > 0 ? `(${retryCount + 1})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}