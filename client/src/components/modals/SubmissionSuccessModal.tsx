/**
 * Submission Success Modal
 * 
 * This modal is displayed when a form has been successfully submitted.
 * It shows confirmation details and provides options to view the generated file
 * or navigate to another page.
 */

import React from 'react';
import { Link } from 'wouter';
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileIcon, ArrowRightIcon, CheckCircleIcon } from 'lucide-react';

export interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  fileName?: string;
  fileId?: number;
  returnPath: string;
  returnLabel: string;
  taskType: string;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  open,
  onClose,
  title,
  message,
  fileName,
  fileId,
  returnPath,
  returnLabel,
  taskType,
}) => {
  // Format the task type for display (e.g., "kyb" -> "KYB")
  const formatTaskType = (type: string) => {
    return type.toUpperCase().replace('_', ' ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <p className="text-gray-700">{message}</p>
          </div>
          
          {fileName && fileId && (
            <div className="bg-gray-50 p-4 rounded-md border mb-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <FileIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{fileName}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Generated {formatTaskType(taskType)} submission file
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs h-7 px-2"
                    onClick={() => {
                      // In a real app, this would download the file
                      console.log(`Downloading file ID: ${fileId}`);
                      window.open(`/api/files/${fileId}`, '_blank');
                    }}
                  >
                    Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-md border">
            <h4 className="font-medium text-sm mb-2">Next Steps</h4>
            <p className="text-xs text-gray-600">
              Your submission has been saved and processed. You can now access additional information
              and reports related to this submission.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            variant="default" 
            onClick={onClose}
            asChild
          >
            <Link href={returnPath} className="flex items-center gap-1">
              {returnLabel} <ArrowRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};