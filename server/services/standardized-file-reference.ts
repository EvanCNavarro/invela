/**
 * Standardized File Reference Service
 * 
 * This service provides a unified approach to working with file references
 * across all form types, ensuring consistent storage and retrieval patterns.
 * 
 * Key features:
 * - Uses a standardized fileId field for all tasks while maintaining backward compatibility
 * - Provides consistent file metadata retrieval across form types
 * - Includes detailed logging for all operations
 * - Implements atomic operations for data integrity
 */

import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Add namespace context to logs
const LOG_CONTEXT = { service: 'StandardizedFileReference' };

/**
 * Store a file reference for a task using a standardized approach
 * 
 * @param taskId The task ID to link the file to
 * @param fileId The file ID to link
 * @param fileName The file name (for logging purposes)
 * @param formType The form type (kyb, ky3p, open_banking, etc.)
 * @param transaction Optional transaction client for atomic operations
 * @returns Whether the operation succeeded
 */
export async function storeFileReference(
  taskId: number,
  fileId: number,
  fileName: string,
  formType?: string,
  transaction?: any
): Promise<boolean> {
  const operationId = `store-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  logger.info(`[${operationId}] Storing file reference for task ${taskId}`, {
    ...LOG_CONTEXT,
    taskId,
    fileId,
    fileName,
    formType
  });
  
  try {
    // Get current task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.error(`[${operationId}] Task ${taskId} not found when storing file reference`, LOG_CONTEXT);
      return false;
    }
    
    // Determine form type from task if not provided
    const normalizedFormType = formType || task.task_type || 'unknown';
    
    // Create standardized metadata with universal 'fileId' field
    // and also maintain backward compatibility with specific fields
    const metadata = {
      ...task.metadata || {},
      
      // Universal field used by all components
      fileId: fileId,
      
      // Add file tracking metadata for searching/filtering
      fileCreatedAt: new Date().toISOString(),
      fileName: fileName,
      
      // Store in type-specific fields for backward compatibility with existing code
      ...(normalizedFormType.includes('kyb') ? { kybFormFile: fileId } : {}),
      ...(normalizedFormType.includes('ky3p') || normalizedFormType.includes('security') ? {
        ky3pFormFile: fileId,
        securityFormFile: fileId
      } : {}),
      ...(normalizedFormType.includes('open_banking') ? { openBankingFormFile: fileId } : {}),
      ...(normalizedFormType.includes('card') ? { cardFormFile: fileId } : {})
    };
    
    // Log the file metadata structure for debugging
    logger.debug(`[${operationId}] File reference metadata structure`, {
      ...LOG_CONTEXT,
      taskId,
      formType: normalizedFormType,
      metadataFields: Object.keys(metadata),
      standardField: 'fileId',
      legacyFields: [
        normalizedFormType.includes('kyb') ? 'kybFormFile' : null,
        normalizedFormType.includes('ky3p') ? 'ky3pFormFile/securityFormFile' : null,
        normalizedFormType.includes('open_banking') ? 'openBankingFormFile' : null,
        normalizedFormType.includes('card') ? 'cardFormFile' : null
      ].filter(Boolean)
    });
    
    // Update task metadata - use transaction if provided, otherwise direct DB update
    if (transaction) {
      // Within transaction
      await transaction.query(
        `UPDATE tasks 
         SET metadata = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(metadata), taskId]
      );
      
      logger.info(`[${operationId}] File reference stored within transaction for task ${taskId}`, {
        ...LOG_CONTEXT,
        taskId,
        fileId,
        formType: normalizedFormType,
        transactional: true
      });
    } else {
      // Direct update
      await db.update(tasks)
        .set({ 
          metadata,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      logger.info(`[${operationId}] File reference stored directly for task ${taskId}`, {
        ...LOG_CONTEXT,
        taskId,
        fileId,
        formType: normalizedFormType,
        transactional: false
      });
    }
    
    return true;
  } catch (error) {
    logger.error(`[${operationId}] Error storing file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      fileId
    });
    return false;
  }
}

/**
 * Get file reference for a task
 * 
 * @param taskId The task ID
 * @returns Object containing file details or undefined if not found
 */
export async function getFileReference(
  taskId: number
): Promise<{ fileId: number; fileName?: string } | undefined> {
  const operationId = `get-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    logger.info(`[${operationId}] Getting file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId
    });
    
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task || !task.metadata) {
      logger.info(`[${operationId}] No metadata found for task ${taskId}`, LOG_CONTEXT);
      return undefined;
    }
    
    // Try to get fileId from standard field first, then fall back to type-specific fields
    const fileId = task.metadata.fileId ||
                  task.metadata.kybFormFile ||
                  task.metadata.ky3pFormFile ||
                  task.metadata.securityFormFile ||
                  task.metadata.openBankingFormFile ||
                  task.metadata.cardFormFile;
    
    if (!fileId) {
      logger.info(`[${operationId}] No file ID found in task ${taskId} metadata`, {
        ...LOG_CONTEXT,
        availableFields: Object.keys(task.metadata)
      });
      return undefined;
    }
    
    // Get the fileName if available from metadata
    const fileName = task.metadata.fileName;
    
    logger.info(`[${operationId}] Found file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      fileId,
      fileName: fileName || 'Not available in metadata',
      source: task.metadata.fileId ? 'standardized' : 'legacy'
    });
    
    return {
      fileId: typeof fileId === 'number' ? fileId : Number(fileId),
      fileName
    };
  } catch (error) {
    logger.error(`[${operationId}] Error getting file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId
    });
    return undefined;
  }
}

/**
 * Verify if a file reference exists and is valid
 * 
 * @param taskId The task ID to check
 * @returns Detailed verification results
 */
export async function verifyFileReference(
  taskId: number
): Promise<{
  hasReference: boolean;
  fileExists: boolean;
  fileId?: number;
  fileName?: string;
  needsRepair: boolean;
  details: string;
}> {
  const operationId = `verify-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    logger.info(`[${operationId}] Verifying file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId
    });
    
    // Get the file reference
    const reference = await getFileReference(taskId);
    const hasReference = !!reference;
    
    if (!hasReference) {
      return {
        hasReference: false,
        fileExists: false,
        needsRepair: true,
        details: 'No file reference found in task metadata'
      };
    }
    
    // Check if the file exists in the database
    const file = await db.query.files.findFirst({
      where: eq(files.id, reference.fileId)
    });
    
    const fileExists = !!file;
    
    return {
      hasReference,
      fileExists,
      fileId: reference.fileId,
      fileName: reference.fileName || file?.name,
      needsRepair: !fileExists,
      details: fileExists 
        ? `Valid file reference found (ID: ${reference.fileId})` 
        : `File reference exists (ID: ${reference.fileId}) but file not found in database`
    };
  } catch (error) {
    logger.error(`[${operationId}] Error verifying file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId
    });
    
    return {
      hasReference: false,
      fileExists: false,
      needsRepair: true,
      details: `Error checking file reference: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Repair a missing file reference by regenerating the file
 * 
 * This method doesn't implement the file regeneration logic directly,
 * but provides a standard interface for the file generation service to use.
 * 
 * @param taskId The task ID to repair
 * @param fileId The ID of the newly generated file
 * @param fileName The name of the newly generated file
 * @param formType The form type
 * @returns Whether the operation succeeded
 */
export async function repairFileReference(
  taskId: number,
  fileId: number,
  fileName: string,
  formType: string
): Promise<boolean> {
  const operationId = `repair-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    logger.info(`[${operationId}] Repairing file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId,
      fileId,
      fileName,
      formType
    });
    
    // Store the new file reference 
    const result = await storeFileReference(taskId, fileId, fileName, formType);
    
    if (result) {
      logger.info(`[${operationId}] Successfully repaired file reference for task ${taskId}`, {
        ...LOG_CONTEXT,
        taskId,
        fileId,
        fileName
      });
    } else {
      logger.error(`[${operationId}] Failed to repair file reference for task ${taskId}`, {
        ...LOG_CONTEXT,
        taskId,
        fileId
      });
    }
    
    return result;
  } catch (error) {
    logger.error(`[${operationId}] Error repairing file reference for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      fileId
    });
    return false;
  }
}

/**
 * Integration with the fix-missing-file endpoint
 * 
 * This function can be called from the fix-missing-file endpoint to
 * determine if a task needs a file repair and provide the necessary data.
 * 
 * @param taskId The task ID to check
 * @returns Object containing verification results and repair status
 */
export async function checkAndPrepareFileRepair(
  taskId: number
): Promise<{
  needsRepair: boolean;
  verificationResult: ReturnType<typeof verifyFileReference>;
  taskType?: string;
  taskStatus?: string;
  companyId?: number;
}> {
  const operationId = `prepare-repair-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    logger.info(`[${operationId}] Checking if task ${taskId} needs file repair`, LOG_CONTEXT);
    
    // Get task information
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.error(`[${operationId}] Task ${taskId} not found`, LOG_CONTEXT);
      return {
        needsRepair: false,
        verificationResult: {
          hasReference: false,
          fileExists: false,
          needsRepair: false,
          details: 'Task not found'
        }
      };
    }
    
    // Verify file reference
    const verificationResult = await verifyFileReference(taskId);
    
    // Determine if repair is needed based on task status and file verification
    // Only submit/completed tasks with missing files need repair
    const isSubmittedTask = task.status === 'submitted' || task.status === 'completed';
    const needsRepair = isSubmittedTask && verificationResult.needsRepair;
    
    logger.info(`[${operationId}] File repair check for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId,
      taskType: task.task_type,
      taskStatus: task.status,
      isSubmittedTask,
      needsRepair,
      verificationDetails: verificationResult.details
    });
    
    return {
      needsRepair,
      verificationResult,
      taskType: task.task_type,
      taskStatus: task.status,
      companyId: task.company_id
    };
  } catch (error) {
    logger.error(`[${operationId}] Error checking file repair status for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId
    });
    
    return {
      needsRepair: false,
      verificationResult: {
        hasReference: false,
        fileExists: false,
        needsRepair: false,
        details: `Error during check: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}