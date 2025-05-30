/**
 * Unified File Tracking Service
 * 
 * This service provides a standardized approach to tracking files across the application.
 * It handles consistent file metadata updates, ensuring files appear in the File Vault UI
 * regardless of which form type generated them.
 */

import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from "../utils/unified-websocket";

// Add namespace context to logs
const logContext = { service: 'UnifiedFileTracking' };

/**
 * Link a file to a task with standardized metadata field names
 * This ensures consistent handling across all form types
 * 
 * @param taskId The task ID to link the file to
 * @param fileId The file ID to link
 * @param fileName The name of the file (for logging/broadcast)
 * @param companyId The company ID for WebSocket broadcasting
 * @param formType The form type (kyb, ky3p, open_banking, etc.)
 */
export async function linkFileToTask(
  taskId: number,
  fileId: number,
  fileName: string,
  companyId: number,
  formType: string
): Promise<boolean> {
  try {
    logger.info(`Linking file to task ${taskId}`, {
      taskId,
      fileId,
      fileName,
      companyId,
      formType
    });
    
    // Get the current task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.error(`Task ${taskId} not found`);
      return false;
    }
    
    // Create a standardized set of metadata fields for files
    // This ensures all task types use consistent field names
    const updatedMetadata = {
      ...task.metadata,
      // Standard field - used by file-missing-fix and other universal handlers
      fileId: fileId,
      
      // Also store in form-specific fields for backward compatibility
      ...(formType === 'kyb' || formType === 'company_kyb' ? { kybFormFile: fileId } : {}),
      ...(formType === 'ky3p' || formType === 'sp_ky3p_assessment' ? {
        ky3pFormFile: fileId,
        securityFormFile: fileId // For backward compatibility
      } : {}),
      ...(formType === 'open_banking' || formType === 'open_banking_survey' ? { openBankingFormFile: fileId } : {}),
      ...(formType === 'card' || formType === 'company_card' ? { cardFormFile: fileId } : {}),
      
      // Add file tracking metadata
      fileCreatedAt: new Date().toISOString(),
      fileName: fileName
    };
    
    // Update the task with the new metadata
    await db.update(tasks)
      .set({
        metadata: updatedMetadata,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast file vault update to refresh UI
    WebSocketService.broadcast('file_vault_update', {
      companyId,
      fileId,
      fileName,
      action: 'added',
      source: 'unified_file_tracking'
    });
    
    // Also broadcast a refresh event after a short delay
    // This ensures the UI correctly shows the new file
    setTimeout(() => {
      WebSocketService.broadcast('file_vault_update', {
        companyId,
        action: 'refresh',
        source: 'unified_file_tracking'
      });
    }, 500);
    
    return true;
  } catch (error) {
    logger.error(`Error linking file ${fileId} to task ${taskId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Verify if a file is properly linked to a task
 * 
 * @param taskId The task ID to check
 * @returns Object containing check results
 */
export async function verifyFileTaskLink(taskId: number): Promise<{
  hasTaskFile: boolean;
  fileExists: boolean;
  fileId?: number;
  fileName?: string;
  detailsMatch: boolean;
  needsRepair: boolean;
}> {
  try {
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return {
        hasTaskFile: false,
        fileExists: false,
        detailsMatch: false,
        needsRepair: false
      };
    }
    
    // Check for fileId in task metadata (standard field)
    const fileId = task.metadata?.fileId || 
                  task.metadata?.kybFormFile || 
                  task.metadata?.ky3pFormFile || 
                  task.metadata?.securityFormFile || 
                  task.metadata?.openBankingFormFile || 
                  task.metadata?.cardFormFile;
    
    const hasTaskFile = !!fileId;
    
    if (!hasTaskFile) {
      return {
        hasTaskFile: false,
        fileExists: false,
        detailsMatch: false,
        needsRepair: task.status === 'submitted' // Only needs repair if submitted
      };
    }
    
    // Check if file exists in files table
    const file = await db.query.files.findFirst({
      where: eq(files.id, fileId as number)
    });
    
    const fileExists = !!file;
    
    // Check if file metadata matches task
    const detailsMatch = fileExists && 
                        (file?.metadata?.taskId === taskId || 
                         file?.task_id === taskId);
    
    return {
      hasTaskFile,
      fileExists,
      fileId: fileId as number,
      fileName: file?.name,
      detailsMatch,
      needsRepair: !fileExists || !detailsMatch
    };
  } catch (error) {
    logger.error(`Error verifying file link for task ${taskId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      hasTaskFile: false,
      fileExists: false,
      detailsMatch: false,
      needsRepair: true
    };
  }
}
