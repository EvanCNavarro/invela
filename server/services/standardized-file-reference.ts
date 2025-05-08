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

import { PoolClient } from 'pg';
import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq, and, isNull, desc, not } from 'drizzle-orm';
import * as transactionManager from './transaction-manager';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'StandardizedFileReference' });

// Form type to file metadata field mapping for backward compatibility
const formTypeToFieldMap = {
  kyb: 'kybFormFile',
  ky3p: 'securityFormFile',
  security: 'securityFormFile',
  open_banking: 'openBankingFormFile',
  card: 'cardFormFile',
  default: 'fileId'
};

/**
 * Get the appropriate metadata field name based on form type
 * 
 * @param formType Form type identifier
 * @returns The metadata field name used for storing file references
 */
function getMetadataFieldForFormType(formType: string): string {
  const normalizedType = formType.toLowerCase().trim();
  return formTypeToFieldMap[normalizedType as keyof typeof formTypeToFieldMap] || 
         formTypeToFieldMap.default;
}

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
  formType: string,
  transaction?: PoolClient
): Promise<boolean> {
  const trx = transaction || (await transactionManager.startTransaction());
  const dbClient = transaction ? transactionManager.withTransaction(trx) : db;
  const startTime = Date.now();
  
  try {
    moduleLogger.info(`Storing file reference for task ${taskId}`, {
      taskId,
      fileId,
      fileName,
      formType,
      operation: 'storeFileReference',
    });

    // First update the unified fileId field in the database
    const metadataFieldName = getMetadataFieldForFormType(formType);
    
    // Get current task data
    const taskData = await dbClient.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Update task metadata with file ID
    const currentMetadata = taskData.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      // Standard fileId field for uniformity across all form types
      fileId: fileId,
      // Legacy field for backward compatibility
      [metadataFieldName]: fileId
    };

    // Update the task with the new metadata
    await dbClient.update(tasks).set({
      metadata: updatedMetadata
    }).where(eq(tasks.id, taskId));
    
    // Log success with timing information
    const duration = Date.now() - startTime;
    moduleLogger.info(`File reference stored successfully for task ${taskId}`, {
      taskId,
      fileId,
      fileName,
      formType,
      metadataFieldName,
      durationMs: duration,
      operation: 'storeFileReference',
    });
    
    // Commit the transaction if we created it internally
    if (!transaction) {
      await transactionManager.commitTransaction(trx);
    }
    
    return true;
  } catch (error) {
    // Log the error
    moduleLogger.error(`Error storing file reference for task ${taskId}`, {
      taskId,
      fileId,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      operation: 'storeFileReference',
    });
    
    // Rollback the transaction if we created it internally
    if (!transaction) {
      await transactionManager.rollbackTransaction(trx);
    }
    
    throw error;
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
): Promise<{ fileId: number; fileName: string; fileExists: boolean } | undefined> {
  try {
    moduleLogger.debug(`Getting file reference for task ${taskId}`);
    
    // Get task data
    const taskData = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData || !taskData.metadata) {
      moduleLogger.info(`No metadata found for task ${taskId}`);
      return undefined;
    }
    
    // Extract file ID from task metadata using standardized field
    // Fall back to legacy fields if standard field is not found
    const fileId = taskData.metadata.fileId || 
                  taskData.metadata.kybFormFile || 
                  taskData.metadata.securityFormFile || 
                  taskData.metadata.openBankingFormFile || 
                  taskData.metadata.cardFormFile;
    
    if (!fileId) {
      moduleLogger.info(`No file ID found in metadata for task ${taskId}`, {
        metadataKeys: Object.keys(taskData.metadata),
      });
      return undefined;
    }
    
    // Verify file exists
    const fileData = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });
    
    if (!fileData) {
      moduleLogger.warn(`File ${fileId} referenced by task ${taskId} not found in database`);
      return {
        fileId: fileId as number,
        fileName: `missing_file_${fileId}.json`,
        fileExists: false
      };
    }
    
    return {
      fileId: fileData.id,
      fileName: fileData.original_name || `file_${fileData.id}.json`,
      fileExists: true
    };
  } catch (error) {
    moduleLogger.error(`Error getting file reference for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
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
): Promise<{ hasReference: boolean; fileExists: boolean; fileId?: number; fileName?: string }> {
  try {
    moduleLogger.debug(`Verifying file reference for task ${taskId}`);
    
    const fileReference = await getFileReference(taskId);
    
    if (!fileReference) {
      return {
        hasReference: false,
        fileExists: false
      };
    }
    
    return {
      hasReference: true,
      fileExists: fileReference.fileExists,
      fileId: fileReference.fileId,
      fileName: fileReference.fileName
    };
  } catch (error) {
    moduleLogger.error(`Error verifying file reference for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return a safe default
    return {
      hasReference: false,
      fileExists: false
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
/**
 * Standardize file references in form data
 * 
 * This function ensures all file references in form data follow a consistent pattern
 * by normalizing file IDs and ensuring they're properly placed in the formData.
 * 
 * @param formData The original form data
 * @param formType The form type (kyb, ky3p, etc.)
 * @returns Standardized form data with consistent file references
 */
export function standardizeFileReference(
  formData: Record<string, any>,
  formType: string
): Record<string, any> {
  // Create a copy to avoid modifying the original
  const standardizedData = { ...formData };
  
  // Get the appropriate metadata field for this form type
  const metadataField = getMetadataFieldForFormType(formType);
  
  // If there's a fileId field but not a form-specific field, add it
  if (standardizedData.fileId && !standardizedData[metadataField]) {
    standardizedData[metadataField] = standardizedData.fileId;
    moduleLogger.debug(`Adding standardized file reference for ${formType}`, {
      formType,
      metadataField,
      fileId: standardizedData.fileId
    });
  }
  
  // If there's a form-specific field but not a fileId field, add it
  if (standardizedData[metadataField] && !standardizedData.fileId) {
    standardizedData.fileId = standardizedData[metadataField];
    moduleLogger.debug(`Adding generic fileId reference for ${formType}`, {
      formType,
      metadataField,
      fileId: standardizedData[metadataField]
    });
  }
  
  return standardizedData;
}

/**
 * Get the standardized file ID from form data
 * 
 * @param formData The form data to extract file ID from
 * @param formType The form type (kyb, ky3p, etc.) 
 * @returns The file ID if found, undefined otherwise
 */
export function getStandardizedFileId(
  formData: Record<string, any>,
  formType: string
): number | string | undefined {
  // First check for the standard fileId field
  if (formData.fileId) {
    return formData.fileId;
  }
  
  // Then check for form-specific fields based on type
  const metadataField = getMetadataFieldForFormType(formType);
  if (formData[metadataField]) {
    return formData[metadataField];
  }
  
  // File ID not found in any expected field
  return undefined;
}

export async function repairFileReference(
  taskId: number,
  fileId: number,
  fileName: string,
  formType: string,
  transaction?: PoolClient
): Promise<boolean> {
  try {
    moduleLogger.info(`Repairing file reference for task ${taskId}`, {
      taskId,
      fileId,
      fileName,
      formType
    });
    
    // Store the file reference using our standard method
    return await storeFileReference(taskId, fileId, fileName, formType, transaction);
  } catch (error) {
    moduleLogger.error(`Error repairing file reference for task ${taskId}`, {
      taskId,
      fileId,
      fileName,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
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
  hasReference: boolean; 
  fileExists: boolean; 
  fileId?: number; 
  fileName?: string; 
  needsRepair: boolean; 
  details: string;
}> {
  try {
    moduleLogger.info(`Checking if task ${taskId} needs file repair`);
    
    // Get task to verify it exists and determine type
    const taskData = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Verify file reference
    const fileStatus = await verifyFileReference(taskId);
    
    // Determine if repair is needed and provide details
    let needsRepair = false;
    let details = '';
    
    if (!fileStatus.hasReference) {
      needsRepair = true;
      details = `No file reference found for task ${taskId}. A new file needs to be generated.`;
    } else if (!fileStatus.fileExists) {
      needsRepair = true;
      details = `File reference exists (ID: ${fileStatus.fileId}) but the actual file is missing. A new file needs to be generated.`;
    } else {
      details = `File reference is valid and the file exists (ID: ${fileStatus.fileId}).`;
    }
    
    moduleLogger.info(`File repair check for task ${taskId}`, {
      taskId,
      hasReference: fileStatus.hasReference,
      fileExists: fileStatus.fileExists,
      fileId: fileStatus.fileId,
      needsRepair,
      details
    });
    
    return {
      ...fileStatus,
      needsRepair,
      details
    };
  } catch (error) {
    moduleLogger.error(`Error checking file repair status for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
  }
}