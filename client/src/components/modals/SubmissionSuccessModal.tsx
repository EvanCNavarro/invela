import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, CheckCircle, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface SubmissionSuccessModalProps {
  /** Whether the modal is open */
  open: boolean;
  
  /** Callback when the modal is closed */
  onClose: () => void;
  
  /** Title of the modal */
  title: string;
  
  /** Description of the modal */
  description: string;
  
  /** List of actions that were performed as a result of submission */
  actions?: string[];
  
  /** Path to redirect to after the user is done */
  returnPath?: string;
  
  /** Label for the return button */
  returnLabel?: string;
  
  /** The type of task that was submitted */
  taskType?: string;
}

/**
 * SubmissionSuccessModal Component
 * 
 * This component displays a success modal after a form has been successfully
 * submitted, with details about the actions that were performed and a button
 * to navigate to the next screen.
 */
export function SubmissionSuccessModal({
  open,
  onClose,
  title,
  description,
  actions = [],
  returnPath = '/tasks',
  returnLabel = 'Return to Tasks',
  taskType
}: SubmissionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {actions.length > 0 && (
          <div className="space-y-3 py-2">
            <h4 className="text-sm font-medium">The following actions were completed:</h4>
            <ul className="space-y-2">
              {actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className={cn(
                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
                    "bg-green-100 text-green-600"
                  )}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-sm text-muted-foreground">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <DialogFooter>
          <Button asChild>
            <Link href={returnPath} onClick={onClose}>
              {returnLabel} <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionSuccessModal;