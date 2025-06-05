/**
 * Enhanced KY3P Form Submission Handler
 * 
 * This module provides an improved API endpoint for KY3P form submissions
 * that ensures correct progress values (100%) are set and maintained.
 * 
 * Key improvements:
 * 1. Type enforcement for progress values using our new enforcer utility
 * 2. SQL type casting for progress values to avoid type conversion issues
 * 3. Detailed logging for improved debugging and monitoring
 * 4. Better error handling with more informative error messages
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pResponses, files } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { validateProgress } from '../utils/progress-validator';
import { enforceKy3pSubmittedProgress } from '../utils/ky3p-progress-enforcer';
import { MessageType, TaskStatus } from '../types';
import { broadcastTaskUpdate, broadcastFormSubmission } from '../utils/unified-websocket';

// Constants for consistent values
const PROGRESS_COMPLETE = 100;
const SUBMITTED_STATUS = TaskStatus.SUBMITTED;

// Define status constants for safer type handling
const COMPLETE_STATUS = 'COMPLETE';
const EMPTY_STATUS = 'EMPTY';
const INCOMPLETE_STATUS = 'INCOMPLETE';
const INVALID_STATUS = 'INVALID';
const FILE_STATUS_PROCESSED = 'processed';

// Create router
const router = Router();

/**
 * Enhanced KY3P form submission endpoint
 * 
 * This endpoint handles KY3P form submissions with improved progress handling
 * that ensures progress values are correctly stored as 100% when forms are submitted.
 */
router.post('/api/ky3p/enhanced-submit/:taskId', requireAuth, async (req, res) => {
  // Create a unique transaction ID for tracking this submission
  const transactionId = `ky3p_submit_${Date.now()}_${randomUUID().substring(0, 8)}`;
  
  logger.info(`[Enhanced KY3P Submission] Processing form submission`, {
    transactionId,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
  
  try {
    // Parse and validate taskId
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId, 10);
    
    if (isNaN(taskIdNum)) {
      logger.warn(`[Enhanced KY3P Submission] Invalid task ID format: ${taskId}`, {
        transactionId
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID format',
        errorType: 'VALIDATION_ERROR'
      });
    }
    
    // Extract form data and validate
    const { formData, fileName = null } = req.body;
    
    if (!formData || typeof formData !== 'object') {
      logger.warn(`[Enhanced KY3P Submission] Missing or invalid form data`, {
        transactionId,
        formDataType: typeof formData
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid form data',
        errorType: 'VALIDATION_ERROR'
      });
    }
    
    // Fetch the current task to get its metadata
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskIdNum),
      columns: {
        id: true,
        metadata: true,
        status: true,
        progress: true,
        company_id: true,
        created_by: true,
        assigned_to: true,
      }
    });
    
    if (!existingTask) {
      logger.warn(`[Enhanced KY3P Submission] Task not found: ${taskIdNum}`, {
        transactionId
      });
      
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`,
        errorType: 'NOT_FOUND'
      });
    }
    
    // Log current task state for debugging
    logger.info(`[Enhanced KY3P Submission] Current task state:`, {
      taskId: existingTask.id,
      status: existingTask.status,
      progress: existingTask.progress,
      companyId: existingTask.company_id,
      transactionId
    });
    
    // Prepare metadata update with submission indicators
    const submissionTimestamp = new Date().toISOString();
    const updatedMetadata = {
      ...existingTask.metadata,
      submitted: true,
      submission_date: submissionTimestamp,
      completed: true,
      fileId: null // Will be updated if a file is provided
    };
    
    // Create a file record if fileName is provided
    let fileId = null;
    
    if (fileName) {
      logger.info(`[Enhanced KY3P Submission] Creating file record for: ${fileName}`, {
        transactionId
      });
      
      try {
        // Create a file record
        const fileInsertResult = await db.insert(files)
          .values({
            name: fileName,
            type: 'application/pdf', // Assume PDF for KY3P forms
            path: `ky3p/${taskIdNum}/${fileName}`,
            uploaded_by: req.user?.id || existingTask.created_by,
            task_id: taskIdNum,
            status: FILE_STATUS_PROCESSED,
            metadata: {
              sourceType: 'ky3p_form',
              generatedAt: submissionTimestamp
            }
          })
          .returning({ id: files.id });
        
        if (fileInsertResult && fileInsertResult.length > 0) {
          fileId = fileInsertResult[0].id;
          updatedMetadata.fileId = fileId;
          
          logger.info(`[Enhanced KY3P Submission] File record created successfully`, {
            fileId,
            fileName,
            transactionId
          });
        }
      } catch (fileError) {
        logger.error(`[Enhanced KY3P Submission] Error creating file record`, {
          error: fileError instanceof Error ? fileError.message : String(fileError),
          fileName,
          transactionId
        });
        // Continue execution - file record creation is not critical for submission
      }
    }
    
    // Start a transaction to ensure all updates are atomic
    const result = await db.transaction(async (tx) => {
      // 1. Update the task metadata and set status to submitted with 100% progress
      const [updatedTask] = await tx.update(tasks)
        .set({
          status: SUBMITTED_STATUS,
          // Use explicit SQL casting to ensure proper type handling
          progress: sql`CAST(${PROGRESS_COMPLETE} AS INTEGER)`,
          metadata: updatedMetadata,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskIdNum))
        .returning({
          id: tasks.id,
          status: tasks.status,
          progress: tasks.progress,
          metadata: tasks.metadata
        });
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskIdNum}`);
      }
      
      // 2. Update form responses if provided
      if (formData && Object.keys(formData).length > 0) {
        for (const [fieldKey, value] of Object.entries(formData)) {
          try {
            // Insert or update response for this field
            await tx.insert(ky3pResponses)
              .values({
                task_id: taskIdNum,
                field_key: fieldKey,
                response_value: value ? String(value) : null,
                status: COMPLETE_STATUS,
                created_at: new Date(),
                updated_at: new Date(),
                version: 1
              })
              .onConflictDoUpdate({
                target: [ky3pResponses.task_id, ky3pResponses.field_key],
                set: {
                  response_value: value ? String(value) : null,
                  status: COMPLETE_STATUS,
                  updated_at: new Date(),
                  version: sql`${ky3pResponses.version} + 1`
                }
              });
          } catch (responseError) {
            logger.error(`[Enhanced KY3P Submission] Error saving response for field ${fieldKey}`, {
              error: responseError instanceof Error ? responseError.message : String(responseError),
              fieldKey,
              transactionId
            });
            // Continue with other fields - don't fail the entire submission
          }
        }
      }
      
      return updatedTask;
    });
    
    // Broadcast the update to connected clients using both task update and form submission
    try {
      // Send a task update for compatibility with existing code
      broadcastTaskUpdate({
        taskId: taskIdNum,
        status: SUBMITTED_STATUS,
        progress: PROGRESS_COMPLETE,
        metadata: {
          ...updatedMetadata,
          timestamp: submissionTimestamp,
          submitted: true,
          submission_date: submissionTimestamp
        },
        message: 'KY3P form submitted successfully'
      });
      
      // Also send a form submission completed event for new clients
      broadcastFormSubmission({
        taskId: taskIdNum,
        formType: 'ky3p',
        status: SUBMITTED_STATUS,
        progress: PROGRESS_COMPLETE,
        companyId: existingTask.company_id,
        fileId: fileId,
        metadata: {
          ...updatedMetadata,
          timestamp: submissionTimestamp
        },
        message: 'KY3P form submitted successfully'
      });
      
      logger.info(`[Enhanced KY3P Submission] Broadcasted updates for ${taskIdNum}`, {
        transactionId,
        submissionTimestamp
      });
    } catch (broadcastError) {
      logger.error(`[Enhanced KY3P Submission] Error broadcasting updates`, {
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError),
        transactionId
      });
      // Continue execution - broadcast failure shouldn't fail the entire submission
    }
    
    // Double-check the task's progress and fix if needed
    try {
      const progressCheckResult = await enforceKy3pSubmittedProgress(taskIdNum);
      
      if (!progressCheckResult.success && progressCheckResult.oldProgress !== PROGRESS_COMPLETE) {
        logger.warn(`[Enhanced KY3P Submission] Progress enforcement was needed for task ${taskIdNum}`, {
          oldProgress: progressCheckResult.oldProgress,
          newProgress: progressCheckResult.newProgress,
          transactionId
        });
      } else {
        logger.info(`[Enhanced KY3P Submission] Progress value verified for task ${taskIdNum}`, {
          progress: progressCheckResult.newProgress || PROGRESS_COMPLETE,
          transactionId
        });
      }
    } catch (progressCheckError) {
      logger.error(`[Enhanced KY3P Submission] Error during progress verification`, {
        error: progressCheckError instanceof Error ? progressCheckError.message : String(progressCheckError),
        transactionId
      });
      // Continue execution - progress check is a safety measure
    }
    
    // Return success response with detailed information
    logger.info(`[Enhanced KY3P Submission] Form submitted successfully for task ${taskIdNum}`, {
      transactionId
    });
    
    return res.status(200).json({
      success: true,
      message: "KY3P form submitted successfully",
      task: {
        id: result.id,
        status: result.status,
        progress: result.progress,
        submitted: true,
        submission_date: submissionTimestamp,
        fileId: fileId,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    logger.error(`[Enhanced KY3P Submission] Error processing KY3P form submission`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId
    });
    
    return res.status(500).json({
      success: false,
      error: "Error processing KY3P form submission",
      message: error instanceof Error ? error.message : String(error),
      errorType: 'SERVER_ERROR'
    });
  }
});

/**
 * Verify KY3P form submission status and correct if needed
 * 
 * This endpoint checks if a KY3P form has been submitted and fixes the
 * progress value if it's not correctly set to 100%.
 */
router.get('/api/ky3p/enhanced-status/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId, 10);
    
    if (isNaN(taskIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID format',
        errorType: 'VALIDATION_ERROR'
      });
    }
    
    // Query the task from the database
    const taskResult = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskIdNum),
      columns: {
        id: true,
        status: true,
        progress: true,
        completion_date: true,
        metadata: true
      }
    });
    
    if (!taskResult) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`,
        errorType: 'NOT_FOUND'
      });
    }
    
    // Check if task has been submitted
    const metadata = taskResult.metadata || {};
    const hasSubmissionDate = !!metadata.submission_date;
    const hasSubmittedFlag = !!metadata.submitted;
    
    const isSubmitted = taskResult.status === SUBMITTED_STATUS || hasSubmissionDate || hasSubmittedFlag;
    const hasCorrectProgress = taskResult.progress === PROGRESS_COMPLETE;
    
    // If the task is submitted but doesn't have 100% progress, fix it
    let fixResult = null;
    
    if (isSubmitted && !hasCorrectProgress) {
      logger.info(`[Enhanced KY3P Status] Task ${taskIdNum} is submitted but has incorrect progress (${taskResult.progress}), fixing...`);
      
      fixResult = await enforceKy3pSubmittedProgress(taskIdNum);
      
      if (fixResult.success) {
        logger.info(`[Enhanced KY3P Status] Successfully fixed progress for task ${taskIdNum}`, {
          oldProgress: fixResult.oldProgress,
          newProgress: fixResult.newProgress
        });
      } else {
        logger.error(`[Enhanced KY3P Status] Failed to fix progress for task ${taskIdNum}`, {
          error: fixResult.error
        });
      }
    }
    
    // Return the status information
    return res.status(200).json({
      success: true,
      task: {
        id: taskResult.id,
        status: taskResult.status,
        progress: fixResult?.success ? fixResult.newProgress : taskResult.progress,
        isSubmitted,
        hasSubmissionDate,
        hasSubmittedFlag,
        wasFixed: !!fixResult?.success,
        submission_date: metadata.submission_date
      }
    });
    
  } catch (error) {
    logger.error(`[Enhanced KY3P Status] Error checking submission status`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: "Error checking KY3P submission status",
      message: error instanceof Error ? error.message : String(error),
      errorType: 'SERVER_ERROR'
    });
  }
});

export default router;