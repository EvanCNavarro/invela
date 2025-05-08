/**
 * Standardized Form Submission Handler
 * 
 * This module provides a unified approach to form submissions with consistent
 * behavior across all form types. It ensures that:
 * 
 * 1. Both status and progress are set correctly for all form types
 * 2. CSV files are generated consistently
 * 3. WebSocket notifications are reliable
 * 4. Form-specific post-submission processes are executed
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { ClientFormType, SchemaFormType, mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';
import * as fileCreation from './fileCreation.fixed';
import { withTransactionContext } from './transaction-manager';
import { handleOpenBankingPostSubmission } from './open-banking-handler';
import { broadcastFormSubmissionCompleted, broadcastTaskUpdate } from '../utils/unified-websocket';

// Type for the form submission input
export interface FormSubmissionInput {
  taskId: number;
  companyId: number;
  formType: ClientFormType | SchemaFormType;
  formData: Record<string, any>;
  userId?: number;
}

// Type for the submission result
export interface FormSubmissionResult {
  success: boolean;
  taskId: number;
  status: string;
  progress: number;
  fileId?: string | number;
  warning?: string;
  error?: string;
}

/**
 * Handle form submission with standardized behavior
 * 
 * This function handles the entire form submission process, including:
 * 
 * 1. Validating the form data
 * 2. Updating the task status and progress
 * 3. Creating a CSV file
 * 4. Executing form-specific post-submission processes
 * 5. Broadcasting WebSocket notifications
 * 
 * @param input The form submission input data
 * @returns The result of the submission process
 */
export async function handleFormSubmission(
  input: FormSubmissionInput
): Promise<FormSubmissionResult> {
  const { taskId, companyId, formType: clientFormType, formData, userId } = input;
  const formType = mapClientFormTypeToSchemaType(clientFormType.toString());
  
  logger.info(`[StandardizedSubmissionHandler] Processing form submission for ${formType}`, {
    taskId,
    companyId,
    formType,
    userId,
    fieldsCount: Object.keys(formData).length
  });
  
  try {
    // Use a transaction to ensure atomicity
    return await withTransactionContext(async (tx) => {
      // Step 1: Get the current task data
      const task = await tx.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const currentMetadata = task.metadata || {};
      const submissionDate = new Date().toISOString();
      
      // Step 2: Update the task status, progress and metadata
      const [updatedTask] = await tx.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          metadata: {
            ...currentMetadata,
            submissionDate,
            submitted: true,
            submitted_at: submissionDate,
            submittedBy: userId,
            last_status: task.status
          },
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskId}`);
      }
      
      // Step 3: Create a CSV file for the submission (outside transaction to avoid issues)
      let fileId: string | number | undefined;
      let fileWarning: string | undefined;
      
      try {
        // We use the fixed fileCreation service to avoid type issues
        const fileResult = await fileCreation.createFileForFormSubmission(
          formType,
          taskId,
          companyId,
          formData
        );
        
        if (fileResult.success && fileResult.fileId) {
          fileId = fileResult.fileId;
          logger.info(`[StandardizedSubmissionHandler] Created file for ${formType} submission`, {
            taskId,
            fileId
          });
        } else {
          fileWarning = `Warning: Failed to create file for submission: ${fileResult.error || 'Unknown error'}`;
          logger.warn(`[StandardizedSubmissionHandler] ${fileWarning}`, {
            taskId,
            formType
          });
        }
      } catch (fileError) {
        fileWarning = `Warning: Error creating file for submission: ${fileError instanceof Error ? fileError.message : String(fileError)}`;
        logger.warn(`[StandardizedSubmissionHandler] ${fileWarning}`, {
          error: fileError instanceof Error ? fileError.message : String(fileError),
          stack: fileError instanceof Error ? fileError.stack : undefined,
          taskId
        });
      }
      
      // Step 4: Execute form-specific post-submission processes
      let postSubmissionWarning: string | undefined;
      
      if (formType === 'open_banking_survey' || formType === 'open_banking') {
        try {
          // Handle Open Banking specific post-submission steps
          const result = await handleOpenBankingPostSubmission(taskId, companyId);
          
          if (!result.success && result.warnings && result.warnings.length > 0) {
            postSubmissionWarning = `Warning: Open Banking post-submission processing had issues: ${result.warnings.join('; ')}`;
            logger.warn(`[StandardizedSubmissionHandler] ${postSubmissionWarning}`, {
              taskId,
              companyId
            });
          }
        } catch (obError) {
          postSubmissionWarning = `Warning: Error in Open Banking post-submission process: ${obError instanceof Error ? obError.message : String(obError)}`;
          logger.warn(`[StandardizedSubmissionHandler] ${postSubmissionWarning}`, {
            error: obError instanceof Error ? obError.message : String(obError),
            stack: obError instanceof Error ? obError.stack : undefined,
            taskId,
            companyId
          });
        }
      }
      
      // Step 5: Broadcast WebSocket notifications for task status update
      try {
        // Broadcast task update
        broadcastTaskUpdate(
          taskId,
          100,
          'submitted',
          {
            formType,
            submissionDate,
            fileId
          }
        );
        
        // Broadcast form submission completed
        broadcastFormSubmissionCompleted(
          taskId,
          formType.toString(),
          companyId,
          submissionDate
        );
        
        logger.info(`[StandardizedSubmissionHandler] Broadcast notifications sent for ${formType} submission`, {
          taskId,
          formType
        });
      } catch (wsError) {
        logger.warn(`[StandardizedSubmissionHandler] Error broadcasting task updates`, {
          error: wsError instanceof Error ? wsError.message : String(wsError),
          stack: wsError instanceof Error ? wsError.stack : undefined,
          taskId
        });
        // Non-critical error, we continue
      }
      
      // Combine any warnings
      const warning = [fileWarning, postSubmissionWarning]
        .filter(Boolean)
        .join('\n');
      
      logger.info(`[StandardizedSubmissionHandler] Successfully processed ${formType} submission`, {
        taskId,
        companyId,
        fileId,
        hasWarning: !!warning
      });
      
      return {
        success: true,
        taskId,
        status: 'submitted',
        progress: 100,
        fileId,
        warning: warning || undefined
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`[StandardizedSubmissionHandler] Error processing form submission`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      companyId,
      formType
    });
    
    try {
      // Try to broadcast error status
      broadcastFormSubmissionCompleted(
        taskId,
        formType.toString(),
        companyId,
        new Date().toISOString()
      );
    } catch (wsError) {
      // Ignore WebSocket errors in error handlers
    }
    
    return {
      success: false,
      taskId,
      status: 'error',
      progress: -1,
      error: errorMessage
    };
  }
}