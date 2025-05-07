/**
 * Enhanced Task Download Menu Component
 * 
 * This component extends TaskDownloadMenu with better file repair integration.
 * It wraps the original component and automatically provides the necessary props.
 */
import React from 'react';
import { TaskDownloadMenu } from './TaskDownloadMenu';
import getLogger from '@/utils/logger';

const logger = getLogger('EnhancedTaskDownloadMenu');

interface EnhancedTaskDownloadMenuProps {
  taskId: number;
  fileId: number | null;
  onDownload: (format: 'csv' | 'txt' | 'json') => Promise<void>;
  taskType?: string;
  onFileIdUpdate?: (fileId: number) => void;
}

export const EnhancedTaskDownloadMenu: React.FC<EnhancedTaskDownloadMenuProps> = ({
  taskId,
  fileId,
  onDownload,
  taskType = 'form',
  onFileIdUpdate
}) => {
  // Handle file regeneration callback
  const handleFileRegenerated = (newFileId: number) => {
    logger.info(`File regenerated successfully: ID ${newFileId} for task ${taskId}`);
    
    // Call the parent callback if provided
    if (onFileIdUpdate) {
      onFileIdUpdate(newFileId);
    }
  };

  return (
    <TaskDownloadMenu
      taskId={taskId}
      fileId={fileId || undefined}
      onDownload={onDownload}
      taskType={taskType}
      disabled={!fileId}
      onFileIdUpdate={handleFileRegenerated}
    />
  );
};

export default EnhancedTaskDownloadMenu;