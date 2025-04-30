/**
 * SubmissionErrorModal Component
 * 
 * This component displays an error message after a failed form submission.
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
import { AlertCircle } from 'lucide-react';
import getLogger from '@/utils/logger';

const logger = getLogger('SubmissionErrorModal');

export function SubmissionErrorModal() {
  const { isErrorModalOpen, modalData, closeModals } = useModalStore();
  
  React.useEffect(() => {
    if (isErrorModalOpen) {
      logger.debug('Error modal opened', { title: modalData.title });
    }
  }, [isErrorModalOpen, modalData.title]);
  
  return (
    <Dialog open={isErrorModalOpen} onOpenChange={(open) => {
      if (!open) {
        logger.debug('Modal closed by user');
        closeModals();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <DialogTitle className="text-2xl">{modalData.title}</DialogTitle>
          <DialogDescription className="text-center mt-2">
            {modalData.description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button onClick={closeModals} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}