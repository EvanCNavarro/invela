import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmissionErrorModalProps {
  /** Whether the modal is open */
  open: boolean;
  
  /** Callback when the modal is closed */
  onClose: () => void;
  
  /** Title of the modal */
  title: string;
  
  /** Description/error message */
  description: string;
  
  /** Detailed error information (for developers) */
  errorDetails?: string;
  
  /** Label for the primary action button */
  buttonText?: string;
  
  /** Callback when the retry button is clicked */
  onRetry?: () => void;
}

/**
 * SubmissionErrorModal Component
 * 
 * This component displays an error modal when form submission fails,
 * with error details and retry functionality.
 */
export function SubmissionErrorModal({
  open,
  onClose,
  title,
  description,
  errorDetails,
  buttonText = 'Try Again',
  onRetry
}: SubmissionErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {errorDetails && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Technical Details</span>
              </div>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {showDetails && (
              <div className="max-h-[200px] overflow-auto rounded-md bg-muted p-3">
                <pre className="text-xs text-muted-foreground">
                  {errorDetails}
                </pre>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onRetry && (
            <Button onClick={onRetry}>
              {buttonText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionErrorModal;