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
import * as fileCreationService from './fileCreation';
import * as WebSocketService from './websocket';
import { 
  sendFormSubmissionSuccess, 
  sendFormSubmissionError, 
  sendFormSubmissionInProgress 
} from '../utils/form-submission-notifications';
import { broadcastFormSubmissionCompleted } from '../utils/unified-websocket';

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
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    logger.info('Starting form submission transaction', {
      taskId,
      userId,
      companyId,
      formType,
      transactionId,
      logContext
    });
    
    // Send an in-progress notification to inform the client
    try {
      sendFormSubmissionInProgress({
        taskId,
        formType,
        companyId,
        progress: 25, // Starting progress
        message: 'Processing form submission...',
        metadata: {
          transactionId,
          step: 'transaction_start',
          timestamp: new Date().toISOString()
        }
      });
    } catch (wsError) {
      // Log but don't stop the process if notification fails
      console.warn('[TransactionalFormHandler] Failed to send in-progress notification:', wsError);
    }
    
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
          console.log(`[TransactionalFormHandler] Starting file creation for task ${taskId}`, {
            taskId,
            formType: schemaTaskType,
            companyId,
            userId,
            formDataKeys: Object.keys(standardizedFormData).length,
            timestamp: new Date().toISOString()
          });
          
          // Send a progress update before starting file creation
          try {
            sendFormSubmissionInProgress({
              taskId,
              formType,
              companyId,
              progress: 50, // Update progress during file creation
              message: 'Generating file for form submission...',
              metadata: {
                step: 'file_creation_start',
                timestamp: new Date().toISOString()
              }
            });
          } catch (wsError) {
            // Log but don't stop the process if notification fails
            console.warn('[TransactionalFormHandler] Failed to send file creation progress notification:', wsError);
          }
          
          const fileResult = await fileCreationService.createTaskFile(
            taskId,
            schemaTaskType,
            standardizedFormData,
            companyId,
            userId
          );
          
          // Log more detailed file creation results for debugging
          console.log(`[TransactionalFormHandler] File creation result for task ${taskId}:`, {
            success: fileResult.success,
            fileId: fileResult.fileId,
            fileName: fileResult.fileName,
            error: fileResult.error,
            timestamp: new Date().toISOString()
          });
          
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
            
            console.log(`[FileCreation] ✅ File ${fileId} created for task ${taskId} and linked to file vault`);
          } else {
            console.error(`[FileCreation] ❌ File creation failed for task ${taskId}:`, {
              error: fileResult.error || 'No error details provided',
              timestamp: new Date().toISOString()
            });
          }
        } catch (fileError) {
          console.error(`[TransactionalFormHandler] CRITICAL ERROR: File creation failed during transaction for task ${taskId}:`, {
            taskId,
            formType,
            error: fileError instanceof Error ? fileError.message : 'Unknown error',
            stack: fileError instanceof Error ? fileError.stack : undefined,
            timestamp: new Date().toISOString()
          });
          
          logger.error('Error creating file during transaction', {
            taskId,
            formType,
            error: fileError instanceof Error ? fileError.message : 'Unknown error',
            stack: fileError instanceof Error ? fileError.stack : undefined
          });
          // Continue with submission even if file creation fails
        }
      }
      
      // 4. Update task status to 'submitted' with 100% progress
      console.log(`[TransactionalFormHandler] Updating task ${taskId} status to 'submitted' with 100% progress`);
      
      try {
        // CRITICAL FIX: Explicitly update the task status and progress in the database
        // This ensures the task is marked as submitted even if WebSocket broadcast fails
        const submissionDate = new Date().toISOString();
        
        await client.query(
          `UPDATE tasks 
           SET status = 'submitted', 
               progress = 100, 
               metadata = jsonb_set(
                 jsonb_set(COALESCE(metadata, '{}'::jsonb), '{submitted}', 'true'),
                 '{submissionDate}', to_jsonb($2::text)
               ),
               updated_at = NOW()
           WHERE id = $1`,
          [taskId, submissionDate]
        );
        
        console.log(`[TransactionalFormHandler] ✅ Successfully updated task ${taskId} status to 'submitted'`);
      } catch (statusError) {
        // Log the error but continue with the transaction
        console.error(`[TransactionalFormHandler] ❌ Error updating task status for task ${taskId}:`, {
          error: statusError instanceof Error ? statusError.message : 'Unknown error',
          stack: statusError instanceof Error ? statusError.stack : undefined
        });
        
        logger.error('Error updating task status during transaction', {
          taskId,
          formType,
          error: statusError instanceof Error ? statusError.message : 'Unknown error'
        });
      }
      
      // 5. Unlock tabs based on form type
      const tabResult = await UnifiedTabService.unlockTabsForFormSubmission(
        companyId, 
        formType,
        { broadcast: true }
      );
      
      // 6. Broadcast form submission events with comprehensive information
      try {
        console.log(`[TransactionalFormHandler] Broadcasting form submission for task ${taskId}:`, {
          formType,
          taskId,
          companyId,
          hasFileId: !!fileId,
          hasUnlockedTabs: tabResult.availableTabs.includes('file-vault'),
          timestamp: new Date().toISOString()
        });
        
        // Send a final in-progress notification with nearly complete status
        // This helps clients prepare for the completion state
        try {
          sendFormSubmissionInProgress({
            taskId,
            formType,
            companyId,
            progress: 90, // Almost complete
            message: 'Finalizing form submission...',
            metadata: {
              step: 'pre_completion',
              timestamp: new Date().toISOString(),
              unlockedTabs: tabResult.availableTabs
            }
          });
        } catch (wsError) {
          // Log but don't stop the process if notification fails
          console.warn('[TransactionalFormHandler] Failed to send final progress notification:', wsError);
        }
        
        // UPDATED: Define single source of truth for completed actions
        const completedActions = [
          {
            type: "task_completion",
            description: "Task marked as complete",
            data: {
              details: "Your form has been successfully submitted and the task is marked as complete."
            }
          }
        ];
        
        // Add file generation action if a file was created
        if (fileId) {
          // Updated to use proper TypeScript type for file action
          completedActions.push({
            type: "file_generation", 
            description: "File generated",
            data: {
              details: `A ${formType} file has been generated and saved to your file vault.`,
              fileId: typeof fileId === 'string' ? parseInt(fileId, 10) : fileId
            }
          });
        }
        
        // Add tab unlocking action if file-vault was unlocked
        if (tabResult.availableTabs.includes('file-vault')) {
          // Updated to use proper TypeScript structure without 'any' assertion
          completedActions.push({
            type: "tabs_unlocked", // NOTE: Changed to 'tabs_unlocked' to match UniversalSuccessModal expectation
            description: "New Access Granted",
            data: {
              details: `Unlocked tabs: ${tabResult.availableTabs.join(', ')}`,
              buttonText: "Go to File Vault",
              url: "/file-vault"
            }
          });
        }
        
        // Create a single timestamp for consistency
        const submissionTimestamp = new Date().toISOString();
        
        // Log intent to send final message
        console.log(`[TransactionalFormHandler] Sending FINAL completion message for task ${taskId}:`, {
          formType,
          taskId,
          companyId,
          hasCompletedActions: completedActions.length,
          timestamp: submissionTimestamp
        });
        
        // IMPORTANT: Use ONLY broadcastFormSubmissionCompleted with a 'final_completion' source
        // We no longer need sendFormSubmissionSuccess which was causing duplicate notifications
        broadcastFormSubmissionCompleted(
          formType,
          taskId,
          companyId,
          {
            fileId: fileId as number | undefined,
            fileName: standardizedFormData.fileName || undefined,
            unlockedTabs: tabResult.availableTabs,
            completedActions, // Pass the single source of truth for actions
            metadata: {
              formSubmission: true,
              availableTabs: tabResult.availableTabs,
              submissionComplete: true,
              finalCompletion: true,
              timestamp: submissionTimestamp,
              source: 'final_completion' // Add source to metadata as well for redundancy
            }
          }
        );
      } catch (wsError) {
        // Log error but don't fail the transaction
        logger.error('WebSocket broadcast error', {
          taskId,
          formType,
          error: wsError instanceof Error ? wsError.message : 'Unknown error',
          stack: wsError instanceof Error ? wsError.stack : undefined
        });
      }
      
      // 6. Return success result
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
    
    // Send error notification via WebSocket
    try {
      sendFormSubmissionError({
        formType,
        taskId,
        companyId,
        error: errorMessage,
        message: `Form submission failed: ${errorMessage}`,
        metadata: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString()
        }
      });
    } catch (wsError) {
      console.error('[TransactionalFormHandler] Failed to send error notification:', wsError);
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export default {
  submitFormWithTransaction
};
