/**
 * SubmissionSuccessModal Component
 * 
 * A reliable modal component for displaying form submission success.
 * This component includes proper state management and retry logic
 * to ensure it always appears when needed.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'wouter';
import getLogger from '@/utils/logger';

const logger = getLogger('SubmissionSuccessModal');

interface SubmissionSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  taskId?: number;
  taskType?: string;
  fileId?: number;
  onViewFile?: () => void;
  onViewTask?: () => void;
  onClose?: () => void;
  fileTitle?: string;
}

/**
 * Success modal shown after form submission
 */
export function SubmissionSuccessModal({
  open,
  onOpenChange,
  title = 'Submission Successful',
  description = 'Your form has been submitted successfully.',
  taskId,
  taskType,
  fileId,
  onViewFile,
  onViewTask,
  onClose,
  fileTitle,
}: SubmissionSuccessModalProps) {
  const [, navigate] = useRouter();
  const [loadingFileVault, setLoadingFileVault] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fileVaultAvailable, setFileVaultAvailable] = useState(false);
  
  // Log modal state changes for debugging
  useEffect(() => {
    logger.info(`SubmissionSuccessModal state changed:`, {
      open,
      taskId,
      taskType,
      fileId,
      retryCount,
      fileVaultAvailable
    });
  }, [open, taskId, taskType, fileId, retryCount, fileVaultAvailable]);
  
  // Check if the File Vault tab is available when the modal opens
  useEffect(() => {
    if (open && fileId) {
      checkFileVaultAvailability();
    }
  }, [open, fileId]);
  
  // Function to check if the File Vault tab is available
  const checkFileVaultAvailability = async () => {
    try {
      setLoadingFileVault(true);
      
      // First check if we have a fileId
      if (!fileId) {
        logger.info('No fileId provided, File Vault link will be disabled');
        setFileVaultAvailable(false);
        return;
      }
      
      // Get the current company data to check available tabs
      const response = await fetch('/api/companies/current');
      if (!response.ok) {
        throw new Error(`Failed to get company data: ${response.status}`);
      }
      
      const company = await response.json();
      const tabs = company.available_tabs || [];
      const hasFileVault = tabs.includes('file-vault');
      
      logger.info(`File Vault availability check:`, {
        available: hasFileVault,
        tabs,
        fileId,
        retryCount
      });
      
      // If file vault is available, we're good
      if (hasFileVault) {
        setFileVaultAvailable(true);
        return;
      }
      
      // If we've tried too many times, give up
      if (retryCount >= 3) {
        logger.warn('File Vault still not available after multiple retries');
        setFileVaultAvailable(false);
        return;
      }
      
      // Otherwise retry after a delay
      logger.info(`File Vault not available yet, retrying in ${(retryCount + 1) * 1500}ms...`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        checkFileVaultAvailability();
      }, (retryCount + 1) * 1500); // Exponential backoff: 1.5s, 3s, 4.5s
    } catch (error) {
      logger.error('Error checking File Vault availability:', error);
      setFileVaultAvailable(false);
    } finally {
      setLoadingFileVault(false);
    }
  };
  
  // Handle navigation to the file vault
  const handleViewFile = () => {
    if (onViewFile) {
      onViewFile();
    } else if (fileId) {
      navigate('/file-vault');
    }
    onOpenChange(false);
  };
  
  // Handle navigation to the task center
  const handleViewTask = () => {
    if (onViewTask) {
      onViewTask();
    } else if (taskId) {
      navigate('/task-center');
    }
    onOpenChange(false);
  };
  
  // Handle close button
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-6 w-6" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {taskType && (
            <div className="text-sm mb-4">
              <span className="font-medium">Form Type:</span> {taskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          )}
          
          {fileId && fileTitle && (
            <div className="text-sm mb-4">
              <span className="font-medium">File Created:</span> {fileTitle}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            You can view your submitted file in the File Vault, or return to the Task Center.
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
          
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleViewTask}
              className="px-3"
            >
              <span>Task Center</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              variant="default"
              onClick={handleViewFile}
              disabled={!fileVaultAvailable || loadingFileVault}
              className="px-3"
            >
              {loadingFileVault ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              <span>View File</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Function to create and show a submission success modal
 * This utility function ensures the modal appears even if component state is reset.
 */
export function showSubmissionSuccessModal(props: Omit<SubmissionSuccessModalProps, 'open' | 'onOpenChange'>) {
  // Create a modal container if it doesn't exist
  let modalContainer = document.getElementById('modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    document.body.appendChild(modalContainer);
  }
  
  // Create a new success modal in the container
  const modalElement = document.createElement('div');
  modalContainer.appendChild(modalElement);
  
  // Function to clean up the modal
  const cleanup = () => {
    if (modalElement && modalElement.parentNode) {
      modalElement.parentNode.removeChild(modalElement);
    }
  };
  
  // Use a custom React root to render the modal
  const renderModal = () => {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const { SubmissionSuccessModal } = require('./SubmissionSuccessModal');
    
    // Render the modal with the given props
    ReactDOM.render(
      <SubmissionSuccessModal 
        open={true} 
        onOpenChange={(open) => {
          if (!open) {
            cleanup();
          }
        }}
        {...props} 
      />,
      modalElement
    );
  };
  
  // Render the modal
  try {
    renderModal();
    return true;
  } catch (error) {
    logger.error('Error showing submission success modal:', error);
    cleanup();
    return false;
  }
}
