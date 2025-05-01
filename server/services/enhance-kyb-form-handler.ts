/**
 * Enhanced KYB Form Handler Service
 * 
 * This service provides improved handling for KYB form submissions,
 * ensuring files are properly linked to tasks and File Vault
 * can consistently find and display the files.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import * as WebSocketService from './websocket';

const logger = new Logger('EnhancedKybFormHandler');

/**
 * Update task with file information using the unified tracking approach
 * 
 * @param taskId The task ID to update
 * @param fileId The file ID to link
 * @param fileName The file name (for display)
 * @param companyId The company ID (for broadcasting)
 * @returns Success status
 */
export async function updateTaskWithFileInfo(
  taskId: number, 
  fileId: number,
  fileName: string,
  companyId: number
): Promise<boolean> {
  try {
    // Get the current task to access its metadata
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.error(`Task ${taskId} not found for file update`);
      return false;
    }
    
    // Try to use the unified tracking service
    try {
      // Import dynamically to avoid circular dependencies
      const { linkFileToTask } = require('./unified-file-tracking');
      const linked = await linkFileToTask(
        taskId,
        fileId,
        fileName,
        companyId,
        'kyb' // form type
      );
      
      logger.info(`KYB form file linked using unified tracking:`, {
        taskId,
        fileId,
        linked
      });
      
      // Still update task status for consistency
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
        
      return true;
    } catch (linkError) {
      // If unified service fails, fall back to direct update
      logger.warn(`Failed to use unified file tracking service, using direct update:`, {
        error: linkError instanceof Error ? linkError.message : 'Unknown error'
      });
      
      // Fall back to direct metadata update
      const currentDate = new Date();
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          updated_at: currentDate,
          metadata: {
            ...task.metadata,
            kybFormFile: fileId,
            // Add standard fileId field for compatibility with fix-missing-file
            fileId: fileId,
            submissionDate: currentDate.toISOString(),
            formVersion: '1.0',
            fileName: fileName,
            fileCreatedAt: currentDate.toISOString(),
            statusFlow: [...(task.metadata?.statusFlow || []), 'submitted']
              .filter((v, i, a) => a.indexOf(v) === i)
          }
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast file vault update to refresh UI
      WebSocketService.broadcast('file_vault_update', {
        companyId,
        fileId,
        fileName,
        action: 'added',
        source: 'enhanced_kyb_form_handler'
      });
      
      // Also broadcast a refresh event after a short delay
      setTimeout(() => {
        WebSocketService.broadcast('file_vault_update', {
          companyId,
          action: 'refresh',
          source: 'enhanced_kyb_form_handler'
        });
      }, 500);
      
      return true;
    }
  } catch (error) {
    logger.error(`Error updating task ${taskId} with file info`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      fileId
    });
    return false;
  }
}
