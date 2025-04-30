/**
 * SubmissionErrorModal Component
 * 
 * This modal displays after a failed form submission, showing details
 * about what went wrong and how to proceed.
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { modalService } from '@/services/modalService';

export function SubmissionErrorModal() {
  const { isOpen, title, description, returnPath, returnLabel, onClose } = modalService.useErrorModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-2" />
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3 rounded-md bg-red-50 dark:bg-gray-800 text-sm">
            <p className="text-red-700 dark:text-red-300 font-medium mb-1">Troubleshooting:</p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
              <li>Check that all required fields are completed correctly</li>
              <li>There might be an issue with your network connection</li>
              <li>The server might be experiencing temporary issues</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2 pt-4">
          <Button 
            type="button" 
            onClick={() => onClose?.()} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          
          {returnPath && (
            <Link href={returnPath}>
              <Button 
                type="button" 
                onClick={() => onClose?.()} 
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {returnLabel || 'Return to Tasks'}
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionErrorModal;