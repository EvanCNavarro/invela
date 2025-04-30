/**
 * SubmissionSuccessModal Component
 * 
 * This modal displays after a successful form submission, showing details
 * about what was created or changed as a result of the submission.
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
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { modalService } from '@/services/modalService';

export function SubmissionSuccessModal() {
  const { isOpen, title, description, actions, returnPath, returnLabel, onClose } = modalService.useSuccessModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {actions && actions.length > 0 && (
          <div className="space-y-2 my-2">
            {actions.map((action, index) => (
              <div 
                key={`action-${index}`} 
                className="flex items-center p-3 rounded-md bg-green-50 dark:bg-gray-800 text-sm"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-center pt-4">
          {returnPath ? (
            <Link href={returnPath}>
              <Button 
                type="button" 
                onClick={() => onClose?.()} 
                className="w-full"
              >
                {returnLabel || 'Return to Dashboard'}
              </Button>
            </Link>
          ) : (
            <Button 
              type="button" 
              onClick={() => onClose?.()} 
              className="w-full"
            >
              {returnLabel || 'Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionSuccessModal;