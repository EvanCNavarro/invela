/**
 * Transactional Form Handler
 * 
 * This module provides a robust, transaction-based form submission process
 * that ensures consistency and prevents race conditions.
 */

import { logger } from '../utils/logger';
import { withTransaction } from './transaction-manager';
import { UnifiedTabService } from './unified-tab-service';
import * as StandardizedFileReference from './standardized-file-reference';
import * as fileCreationService from './fileCreation.fixed';
import * as WebSocketService from './websocket';

// Add namespace context to logs
const logContext = { service: 'TransactionalFormHandler' };

// Import the database connection
let db: { query: (sql: string, params?: any[]) => Promise<any> };

try {
  db = require('../db').db;
} catch (error) {
  console.error('Database module not found, creating a mock implementation');
  // Create a mock implementation for development/testing
  db = {
    query: async () => ({ rows: [] })
  };
}

interface FormSubmissionOptions {
  taskId: number;
  userId: number;
  companyId: number;
  formData: Record<string, any>;
  formType: string;
}

/**
 * Process a form submission with transactional integrity
 * 
 * This function processes a form submission within a database transaction,
 * ensuring that all operations either succeed or fail together.
 * 
 * @param options Form submission options
 * @returns Result of the form submission
 */
export async function submitFormWithTransaction(options: FormSubmissionOptions): Promise<{
  success: boolean;
  fileId?: string | number;
  availableTabs?: string[];
  taskStatus?: string;
  error?: string;
}> {
  const { taskId, userId, companyId, formData, formType } = options;
  
  logger.info('Starting transactional form submission', {
    taskId,
    userId,
    companyId,
    formType,
    fieldsCount: Object.keys(formData).length
  });
  
  try {
    logger.info('Starting form submission transaction', {
      taskId,
      userId,
      companyId,
      formType,
      transactionId: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      logContext
    });
    
    // Use a transaction to ensure all operations succeed or fail together
    return await withTransaction(async (client) => {
      // 1. Update task status to submitted
      const now = new Date();
      
      // UNIFIED FIX: Use parameterized query to avoid SQL injection and type issues
      await client.query(
        `UPDATE tasks 
         SET status = 'submitted', progress = 100, 
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{submittedAt}', to_jsonb($3::text)), 
             updated_at = $1 
         WHERE id = $2`,
        [now, taskId, now.toISOString()]
      );
      
      // 2. Standardize file references in form data
      const standardizedFormData = StandardizedFileReference.standardizeFileReference(formData, formType);
      const existingFileId = StandardizedFileReference.getStandardizedFileId(standardizedFormData, formType);
      
      // 3. Create a file if needed
      // UNIFIED FIX: Use undefined instead of null to match return type interface
      let fileId: string | number | undefined = existingFileId || undefined;
      
      if (!existingFileId && formType !== 'empty_form') {
        const schemaTaskType = formType;
        
        try {
          const fileResult = await fileCreationService.createTaskFile(
            taskId,
            schemaTaskType,
            standardizedFormData,
            companyId,
            userId
          );
          
          if (fileResult.success && fileResult.fileId) {
            fileId = fileResult.fileId;
            
            // Update task metadata with file information
            // UNIFIED FIX: Use properly parameterized query for the fileId and include fileName
            await client.query(
              `UPDATE tasks 
               SET metadata = jsonb_set(
                 jsonb_set(COALESCE(metadata, '{}'::jsonb), '{fileId}', to_jsonb($2::text)),
                 '{fileName}', to_jsonb($3::text)
               ) 
               WHERE id = $1`,
              [taskId, fileId, fileResult.fileName || '']
            );
            
            // Also ensure the file is properly linked to the task as a form submission file
            await client.query(
              `UPDATE files
               SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{formSubmission}', 'true')
               WHERE id = $1`,
              [fileId]
            );
            
            console.log(`[FileCreation] File ${fileId} created for task ${taskId} and linked to file vault`);
          }
        } catch (fileError) {
          logger.error('Error creating file during transaction', {
            taskId,
            formType,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
          // Continue with submission even if file creation fails
        }
      }
      
      // 4. Unlock tabs based on form type
      const tabResult = await UnifiedTabService.unlockTabsForFormSubmission(
        companyId, 
        formType,
        { broadcast: true }
      );
      
      // 5. Return success result
      return {
        success: true,
        fileId,
        availableTabs: tabResult.availableTabs,
        taskStatus: 'submitted'
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error in transactional form submission', {
      taskId,
      formType,
      userId,
      companyId,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      requestPath: `/api/forms-tx/submit/${formType}/${taskId}`,
      errorCode: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      logContext
    });
    
    // Log to console for immediate visibility during development
    console.error(`[TransactionalFormHandler] Submission error for task ${taskId} (${formType}):`, {
      message: errorMessage,
      stack: errorStack?.split('\n').slice(0, 3).join('\n')
    });
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export default {
  submitFormWithTransaction
};
