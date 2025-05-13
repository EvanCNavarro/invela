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

export interface SubmissionAction {
  type: string;
  description: string;
  fileId?: number;
  data?: {
    details?: string;
    buttonText?: string;
  };
}

export interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  actions?: SubmissionAction[];
  fileName?: string;
  fileId?: number;
  returnPath: string;
  returnLabel: string;
  taskType?: string;
  onDownload?: (format?: 'csv' | 'txt' | 'json') => void;
  // New parameters for improved button options
  showFileVaultButton?: boolean;
  fileVaultPath?: string;
  fileVaultLabel?: string;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  open,
  onClose,
  title,
  message,
  actions = [],
  fileName,
  fileId,
  returnPath = '/task-center',
  returnLabel = 'Return to Task Center',
  taskType = 'task',
  onDownload,
  showFileVaultButton = false,
  fileVaultPath = '/file-vault',
  fileVaultLabel = 'View in File Vault'
}) => {
  // Format a task type string for display (e.g., 'kyb' -> 'KYB', 'ky3p' -> 'KY3P')
  const formatTaskType = (type: string): string => {
    if (!type) return 'Form';
    
    if (type.toLowerCase() === 'kyb') return 'KYB';
    if (type.toLowerCase() === 'ky3p') return 'KY3P';
    if (type.toLowerCase() === 'open_banking') return 'Open Banking';
    
    // Convert snake_case or kebab-case to Title Case
    return type
      .replace(/[-_]/g, ' ')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };
  
  // Default message if none provided
  const defaultMessage = `Your ${formatTaskType(taskType)} form has been successfully submitted.`;
  
  // Check if we have file information from actions or props
  const hasFileInfo = Boolean((fileName && fileId) || actions?.some(action => 
    action.type === 'file_generated' && action.fileId
  ));
  
  // Check if we have any completed actions to show
  const hasActions = Array.isArray(actions) && actions.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          <div className="mb-4">
            <p className="text-gray-700">{message || defaultMessage}</p>
          </div>
          
          {/* Show file information if available */}
          {hasFileInfo && (
            <div className="bg-gray-50 p-4 rounded-md border mb-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <FileIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  {/* Use file info from actions or fallback to props */}
                  <h4 className="font-medium text-sm">
                    {fileName || `${formatTaskType(taskType)} Submission.csv`}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Generated {formatTaskType(taskType)} submission file
                  </p>
                  
                  {/* Download button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs h-7 px-2"
                    onClick={() => {
                      // Use the onDownload callback if provided
                      if (onDownload) {
                        onDownload('csv');
                      } else if (fileId) {
                        console.log(`Downloading file ID: ${fileId}`);
                        window.open(`/api/files/${fileId}`, '_blank');
                      }
                    }}
                  >
                    Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Show completed actions if available */}
          {hasActions && (
            <div className="bg-gray-50 p-4 rounded-md border mb-4">
              <h4 className="font-medium text-sm mb-2">Completed Actions</h4>
              <ul className="space-y-2 text-sm">
                {actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{action.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Next steps section */}
          <div className="bg-gray-50 p-4 rounded-md border">
            <h4 className="font-medium text-sm mb-2">Next Steps</h4>
            <p className="text-xs text-gray-600">
              Your submission has been saved and processed. You can now access additional information
              and reports related to this submission.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between w-full">
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Only show File Vault button if requested or if we have file information */}
            {(showFileVaultButton || hasFileInfo) && (
              <Button 
                variant="outline" 
                onClick={onClose}
                asChild
              >
                <Link href={fileVaultPath} className="flex items-center gap-1">
                  <FileIcon className="w-4 h-4 mr-1" /> {fileVaultLabel}
                </Link>
              </Button>
            )}
            
            <Button 
              variant="default" 
              onClick={onClose}
              asChild
            >
              <Link href={returnPath} className="flex items-center gap-1">
                {returnLabel} <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};