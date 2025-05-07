/**
 * Enhanced Task Download Menu Component
 * 
 * This component extends TaskDownloadMenu with better file repair integration.
 * It wraps the original component and automatically provides the necessary props,
 * allowing for consistent file handling across all form types.
 * 
 * Key features:
 * - Provides consistent taskId parameter across all form types
 * - Handles file regeneration with standardized callback pattern
 * - Tracks file operations with comprehensive logging
 * - Gracefully handles null/undefined fileId cases
 * - Manages disabled state automatically based on file availability
 */
import React, { useCallback } from 'react';
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
  // Log component mounting for debugging
  logger.debug(`EnhancedTaskDownloadMenu mounted for task ${taskId} (${taskType}) with fileId: ${fileId || 'none'}`);
  
  // Handle file regeneration callback
  const handleFileRegenerated = useCallback((newFileId: number) => {
    logger.info(`File regenerated successfully for task ${taskId}`, {
      taskId,
      taskType,
      oldFileId: fileId,
      newFileId,
      timestamp: new Date().toISOString()
    });
    
    // Call the parent callback if provided
    if (onFileIdUpdate) {
      onFileIdUpdate(newFileId);
      logger.debug(`Parent fileId update callback executed for task ${taskId}`);
    }
  }, [taskId, fileId, taskType, onFileIdUpdate]);

  // Create wrapped download handler with error handling and logging
  const handleWrappedDownload = useCallback(async (format: 'csv' | 'txt' | 'json') => {
    logger.info(`Download initiated for task ${taskId} in ${format} format`, {
      taskId,
      fileId,
      format,
      timestamp: new Date().toISOString()
    });
    
    try {
      await onDownload(format);
      logger.info(`Download completed for task ${taskId} in ${format} format`);
    } catch (err) {
      logger.error(`Download failed for task ${taskId} in ${format} format`, {
        error: err instanceof Error ? err.message : String(err),
        taskId,
        fileId,
        format
      });
      // Re-throw to allow the TaskDownloadMenu to handle the error UI
      throw err;
    }
  }, [taskId, fileId, onDownload]);

  return (
    <TaskDownloadMenu
      taskId={taskId}
      fileId={fileId || undefined}
      onDownload={handleWrappedDownload}
      taskType={taskType}
      disabled={!fileId}
      onFileIdUpdate={handleFileRegenerated}
    />
  );
};

export default EnhancedTaskDownloadMenu;