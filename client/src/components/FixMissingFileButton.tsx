/**
 * Fix Missing File Button Component
 * 
 * This component provides a user interface for checking and fixing missing files.
 * It integrates with the standardized file reference API to detect file issues
 * and trigger repair operations when needed.
 * 
 * Features:
 * - Automatically checks for missing files
 * - Provides clear feedback on file status
 * - Handles file repair with loading states
 * - Triggers callback when file is repaired successfully
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileX, FileCheck, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('FixMissingFileButton');

interface FixMissingFileButtonProps {
  taskId: number;
  onFileRepaired?: (fileId: number) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  autoCheck?: boolean;
}

interface FileStatus {
  hasReference: boolean;
  fileExists: boolean;
  fileId?: number;
  needsRepair: boolean;
  details: string;
}

export const FixMissingFileButton: React.FC<FixMissingFileButtonProps> = ({
  taskId,
  onFileRepaired,
  variant = 'secondary',
  size = 'sm',
  className = '',
  autoCheck = true
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const { toast } = useToast();

  // Check file status
  const checkFileStatus = useCallback(async () => {
    if (!taskId) {
      logger.warn('Cannot check file status: No task ID provided');
      return;
    }

    setIsChecking(true);
    
    try {
      logger.info(`Checking file status for task ${taskId}`);
      
      const response = await fetch(`/api/fix-missing-file/${taskId}/check`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check file status');
      }
      
      logger.debug(`File status check result for task ${taskId}`, data.fileStatus);
      setFileStatus(data.fileStatus);
      
      return data.fileStatus;
    } catch (error) {
      logger.error(`Error checking file status for task ${taskId}`, {
        error: error instanceof Error ? error.message : String(error),
        taskId
      });
      
      toast({
        title: 'Failed to check file status',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [taskId, toast]);

  // Repair missing file
  const repairFile = useCallback(async () => {
    if (!taskId) {
      logger.warn('Cannot repair file: No task ID provided');
      return;
    }

    setIsRepairing(true);
    
    try {
      logger.info(`Repairing file for task ${taskId}`);
      
      const response = await fetch(`/api/fix-missing-file/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to repair file');
      }
      
      logger.info(`File repair successful for task ${taskId}`, {
        fileId: data.fileId,
        taskId
      });
      
      // Update local state
      setFileStatus({
        hasReference: true,
        fileExists: true,
        fileId: data.fileId,
        needsRepair: false,
        details: data.details || 'File has been repaired successfully'
      });
      
      // Notify parent component
      if (onFileRepaired && data.fileId) {
        onFileRepaired(data.fileId);
      }
      
      toast({
        title: 'File Repaired',
        description: 'The file has been successfully regenerated and is now available for download.',
        variant: 'default'
      });
      
      return data.fileId;
    } catch (error) {
      logger.error(`Error repairing file for task ${taskId}`, {
        error: error instanceof Error ? error.message : String(error),
        taskId
      });
      
      toast({
        title: 'Failed to repair file',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setIsRepairing(false);
    }
  }, [taskId, toast, onFileRepaired]);

  // Automatically check file status on mount
  useEffect(() => {
    if (autoCheck && taskId) {
      checkFileStatus();
    }
  }, [autoCheck, taskId, checkFileStatus]);

  // Determine button state and appearance
  const getButtonContent = () => {
    if (isChecking) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking...
        </>
      );
    }

    if (isRepairing) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Repairing...
        </>
      );
    }

    // File needs repair
    if (fileStatus?.needsRepair) {
      return (
        <>
          <FileX className="mr-2 h-4 w-4" />
          Repair File
        </>
      );
    }

    // File status has been checked and file is OK
    if (fileStatus && !fileStatus.needsRepair) {
      return (
        <>
          <FileCheck className="mr-2 h-4 w-4" />
          File OK
        </>
      );
    }

    // Default - Check file status
    return (
      <>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Check File
      </>
    );
  };

  // Determine button action
  const handleClick = () => {
    if (isChecking || isRepairing) {
      return; // Do nothing if already processing
    }

    if (fileStatus?.needsRepair) {
      repairFile();
    } else {
      checkFileStatus();
    }
  };

  // Determine button variant based on file status
  const getButtonVariant = () => {
    if (fileStatus?.needsRepair) {
      return 'destructive';
    }
    
    if (fileStatus && !fileStatus.needsRepair) {
      return 'secondary';
    }
    
    return variant;
  };

  // Determine disabled state
  const isDisabled = isChecking || isRepairing || (fileStatus && !fileStatus.needsRepair && !isChecking);

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      title={fileStatus?.details || 'Check if the file reference is valid'}
    >
      {getButtonContent()}
    </Button>
  );
};

export default FixMissingFileButton;