/**
 * SubmissionSuccessModal Component
 * 
 * This component displays a success message after a form submission,
 * along with detailed information about what happened during the submission.
 */

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/services/modalService';
import { CheckCircle } from 'lucide-react';
import getLogger from '@/utils/logger';

const logger = getLogger('SubmissionSuccessModal');

export function SubmissionSuccessModal() {
  const { isSuccessModalOpen, modalData, closeModals } = useModalStore();
  
  React.useEffect(() => {
    if (isSuccessModalOpen) {
      logger.debug('Success modal opened', { 
        title: modalData.title,
        actionCount: modalData.actions?.length || 0
      });
    }
  }, [isSuccessModalOpen, modalData.title, modalData.actions]);
  
  return (
    <Dialog open={isSuccessModalOpen} onOpenChange={(open) => {
      if (!open) {
        logger.debug('Modal closed by user');
        closeModals();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="bg-green-100 p-3 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <DialogTitle className="text-2xl">{modalData.title}</DialogTitle>
          <DialogDescription className="text-center mt-2">
            {modalData.description}
          </DialogDescription>
        </DialogHeader>
        
        {modalData.actions && modalData.actions.length > 0 && (
          <div className="grid gap-3 py-4">
            {modalData.actions.map((action, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-md">
                <h4 className="font-semibold text-sm">{action.label}</h4>
                <p className="text-sm text-slate-600 mt-1">{action.description}</p>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={closeModals} className="w-full">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}