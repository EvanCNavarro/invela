/**
 * Enhanced KYB Form Handler Service
 * 
 * This service provides improved handling for KYB form submissions,
 * ensuring files are properly linked to tasks and File Vault
 * can consistently find and display the files.
 */

import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as WebSocketService from './websocket';

// Use logger with a specific context for this service
const serviceLogger = {
  info: (message, meta) => logger.info(`[EnhancedKybFormHandler] ${message}`, meta),
  error: (message, meta) => logger.error(`[EnhancedKybFormHandler] ${message}`, meta),
  debug: (message, meta) => logger.debug(`[EnhancedKybFormHandler] ${message}`, meta),
  warn: (message, meta) => logger.warn(`[EnhancedKybFormHandler] ${message}`, meta)
};

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
  fileId: number | string,
  fileName: string,
  companyId: number
): Promise<boolean> {
  try {
    // Log the request details
    logger.info('Updating task with file info using enhanced handler', {
      taskId,
      fileId,
      fileName,
      companyId
    });
    
    // Get the current task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found', { taskId });
      return false;
    }
    
    // Update task status to submitted
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        completion_date: new Date(),
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          last_updated: new Date().toISOString(),
          submission_timestamp: new Date().toISOString(),
          status_flow: [...(task.metadata?.status_flow || []), 'submitted'],
          /* Important: Track file information in the task metadata */
          fileId: fileId,
          fileName: fileName,
          kybFormFile: fileId, // This is the standard field name used in multiple places
          formFile: fileId, // Another variant used in some places
          progressHistory: [
            ...(task.metadata?.progressHistory || []),
            { value: 100, timestamp: new Date().toISOString() }
          ]
        }
      })
      .where(eq(tasks.id, taskId));
      
    // Add the task ID to the file metadata too for bidirectional linking
    await db.update(files)
      .set({
        metadata: {
          taskId,
          taskType: 'kyb',
          companyId,
          submissionDate: new Date().toISOString()
        }
      })
      .where(eq(files.id, Number(fileId)));
      
    // Broadcast task update via WebSocket
    WebSocketService.broadcastTaskUpdate(taskId, 'submitted', {
      fileId,
      fileName
    });
    
    // Log success
    logger.info('Task updated successfully with file info', {
      taskId,
      fileId,
      newStatus: 'submitted'
    });
    
    return true;
  } catch (error) {
    logger.error('Error updating task with file info', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      fileId
    });
    return false;
  }
}
