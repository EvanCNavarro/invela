/**
 * Standardized Form Submission Handler
 * 
 * This service provides a consistent approach to handling form submissions
 * for all form types (KYB, KY3P, Open Banking) ensuring that:
 * 1. Task status is properly set to 'submitted'
 * 2. Progress is always set to 100%
 * 3. Metadata includes proper submission indicators
 * 4. Form-specific post-submission actions are executed
 * 5. Notifications are broadcast to all clients
 */

import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as WebSocketService from './websocket-service';
import { broadcastFormSubmission } from '../utils/unified-websocket';
import { TaskStatus } from '../types';
import { mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';
import * as FileCreationService from './fileCreation.fixed';
import * as TransactionManager from './transaction-manager';
import { performance } from 'perf_hooks';

// Define interface for submission request
export interface StandardizedSubmissionRequest {
  taskId: number;
  userId: number;
  companyId: number;
  formData: Record<string, any>;
  formType: string;
  fileName?: string;
}

// Define interface for submission result
export interface StandardizedSubmissionResult {
  success: boolean;
  taskId: number;
  status: string;
  progress: number;
  fileId?: string | number;
  companyId: number;
  submissionDate: string;
  error?: string;
  warnings?: string[];
  elapsedMs?: number;
}

/**
 * Execute form-specific post-submission actions 
 * 
 * These are the specialized steps that need to happen after submission
 * but are specific to each form type
 */
async function executePostSubmissionActions(
  formType: string,
  taskId: number,
  companyId: number,
  userId: number
): Promise<{ success: boolean; warnings?: string[] }> {
  const normalizedFormType = mapClientFormTypeToSchemaType(formType);
  const warnings: string[] = [];
  
  logger.info(`[StandardizedSubmission] Executing post-submission actions for ${normalizedFormType} task ${taskId}`);
  
  try {
    switch (normalizedFormType) {
      case 'kyb':
      case 'company_kyb':
        // Unlock file vault and security tasks
        try {
          const { unlockFileVaultAccess, unlockSecurityTasksForCompany } = await import('./synchronous-task-dependencies');
          await unlockFileVaultAccess(companyId);
          await unlockSecurityTasksForCompany(companyId, userId);
        } catch (unlockError) {
          warnings.push(`Warning: Failed to unlock dependent tasks: ${unlockError instanceof Error ? unlockError.message : String(unlockError)}`);
        }
        break;
        
      case 'ky3p':
      case 'sp_ky3p_assessment':
        // KY3P tasks don't have specific post-submission actions
        break;
        
      case 'open_banking':
      case 'open_banking_survey':
        try {
          // Get the Open Banking post-submission handler
          const { handleOpenBankingPostSubmission } = await import('./open-banking-handler');
          await handleOpenBankingPostSubmission(taskId, companyId);
        } catch (obError) {
          warnings.push(`Warning: Failed to execute Open Banking post-submission actions: ${obError instanceof Error ? obError.message : String(obError)}`);
        }
        break;
        
      default:
        logger.warn(`[StandardizedSubmission] No post-submission actions for form type '${normalizedFormType}'`);
    }
    
    return { success: true, warnings };
  } catch (error) {
    logger.error(`[StandardizedSubmission] Error executing post-submission actions`, {
      error: error instanceof Error ? error.message : String(error),
      formType: normalizedFormType,
      taskId,
      companyId
    });
    
    return { 
      success: false, 
      warnings: [...warnings, `Failed to execute post-submission actions: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

/**
 * Create a file based on the form data
 */
async function createFormFile(
  formType: string,
  taskId: number,
  companyId: number,
  formData: Record<string, any>,
  fileName?: string
): Promise<{ success: boolean; fileId?: string | number; error?: string }> {
  try {
    logger.info(`[StandardizedSubmission] Creating form file for ${formType} task ${taskId}`);
    
    const normalizedFormType = mapClientFormTypeToSchemaType(formType);
    const result = await FileCreationService.createFileForFormSubmission(
      normalizedFormType,
      taskId,
      companyId,
      formData,
      fileName
    );
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Unknown error creating form file' 
      };
    }
    
    return { success: true, fileId: result.fileId };
  } catch (error) {
    logger.error(`[StandardizedSubmission] Error creating form file`, {
      error: error instanceof Error ? error.message : String(error),
      formType,
      taskId,
      companyId
    });
    
    return { 
      success: false, 
      error: `Failed to create form file: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Standardized form submission function that works for all form types
 * 
 * This function ensures consistent behavior for all form submissions:
 * - Status always set to 'submitted'
 * - Progress always set to 100%
 * - Submission date recorded in metadata
 * - File created from form data
 * - Form-specific post-submission actions executed
 * - Notification broadcast to all clients
 */
export async function submitFormStandardized(
  request: StandardizedSubmissionRequest
): Promise<StandardizedSubmissionResult> {
  const startTime = performance.now();
  const { taskId, userId, companyId, formData, formType, fileName } = request;
  const normalizedFormType = mapClientFormTypeToSchemaType(formType);
  const warnings: string[] = [];
  const submissionDate = new Date().toISOString();
  
  logger.info(`[StandardizedSubmission] Processing ${normalizedFormType} submission for task ${taskId}`, {
    taskId, 
    companyId,
    userId,
    formType: normalizedFormType,
    fieldCount: Object.keys(formData).length
  });
  
  try {
    // Wrap everything in a transaction to ensure atomicity
    return await TransactionManager.withTransactionContext(async (tx) => {
      // Step 1: Update task status, progress, and metadata
      try {
        await tx.update(tasks)
          .set({
            status: 'submitted' as TaskStatus,
            progress: 100, // Always set progress to 100% for submitted forms
            submitted_at: new Date(),
            submitted_by: userId,
            updated_at: new Date(),
            metadata: sql`jsonb_set(
              COALESCE(${tasks.metadata}, '{}'::jsonb),
              '{submissionDate}',
              to_jsonb(${submissionDate}::text)
            )`
          })
          .where(eq(tasks.id, taskId));
          
        logger.info(`[StandardizedSubmission] Updated task status to 'submitted' with 100% progress`, {
          taskId,
          formType: normalizedFormType
        });
      } catch (updateError) {
        logger.error(`[StandardizedSubmission] Error updating task status`, {
          error: updateError instanceof Error ? updateError.message : String(updateError),
          taskId,
          formType: normalizedFormType
        });
        
        throw updateError;
      }
      
      // Step 2: Create file from form data
      const fileResult = await createFormFile(
        normalizedFormType,
        taskId,
        companyId,
        formData,
        fileName
      );
      
      if (!fileResult.success) {
        warnings.push(`Warning: ${fileResult.error}`);
      }
      
      // Step 3: Execute form-specific post-submission actions
      const postSubmissionResult = await executePostSubmissionActions(
        normalizedFormType,
        taskId,
        companyId,
        userId
      );
      
      if (!postSubmissionResult.success) {
        warnings.push(...(postSubmissionResult.warnings || []));
      }
      
      // Step 4: Commit transaction and broadcast updates
      const elapsedMs = performance.now() - startTime;
      
      // Broadcast form submission completion to all clients
      try {
        // Try both broadcast methods for maximum client coverage
        await broadcastFormSubmission({
          taskId,
          formType: normalizedFormType,
          status: 'submitted',
          progress: 100,
          companyId,
          fileId: fileResult.fileId,
          submissionDate
        });
        
        logger.info(`[StandardizedSubmission] Broadcast submission completed via unified channel`, {
          taskId,
          formType: normalizedFormType
        });
      } catch (broadcastError) {
        logger.warn(`[StandardizedSubmission] Error broadcasting via unified channel, attempting legacy method`, {
          error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
        });
        
        // Try legacy broadcast as fallback
        try {
          WebSocketService.broadcastFormSubmissionCompleted?.(taskId, normalizedFormType, companyId);
          logger.info(`[StandardizedSubmission] Broadcast submission completed via legacy channel`, {
            taskId,
            formType: normalizedFormType
          });
        } catch (legacyError) {
          warnings.push(`Warning: Failed to broadcast submission completion: ${legacyError instanceof Error ? legacyError.message : String(legacyError)}`);
        }
      }
      
      // Return success result
      return {
        success: true,
        taskId,
        status: 'submitted',
        progress: 100,
        fileId: fileResult.fileId,
        companyId,
        submissionDate,
        warnings: warnings.length > 0 ? warnings : undefined,
        elapsedMs
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const elapsedMs = performance.now() - startTime;
    
    logger.error(`[StandardizedSubmission] Error processing form submission`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      formType: normalizedFormType,
      companyId,
      elapsedMs
    });
    
    // Send error status via WebSocket (both methods)
    try {
      await broadcastFormSubmission({
        taskId,
        formType: normalizedFormType,
        status: 'error',
        companyId,
        error: errorMessage
      });
    } catch (broadcastError) {
      logger.warn(`[StandardizedSubmission] Error broadcasting submission error`, {
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
      });
    }
    
    return {
      success: false,
      taskId,
      status: 'error',
      progress: 0,
      companyId,
      submissionDate,
      error: errorMessage,
      elapsedMs
    };
  }
}