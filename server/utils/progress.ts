import { TaskStatus } from '../types';
import * as WebSocketService from '../services/websocket';
import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  tasks, 
  kybResponses, 
  kybFields, 
  ky3pResponses, 
  ky3pFields, 
  openBankingResponses, 
  openBankingFields,
  KYBFieldStatus
} from '@db/schema';

// Import standardized field status
import { FieldStatus } from './field-status';

// Import centralized status determination function
import { determineTaskStatus } from './task-status-determiner';

import { hasAllRequiredFields } from './kyb-progress';

/**
 * Standardized form field update broadcast
 * 
 * This function broadcasts a form field update to all connected WebSocket clients
 * with a consistent payload structure.
 * 
 * @param taskId Task ID
 * @param fieldKey Field key (string identifier)
 * @param value Field value
 * @param fieldId Optional field ID (numeric)
 */
export function broadcastFieldUpdate(
  taskId: number | string,
  fieldKey: string,
  value: string,
  fieldId?: number
) {
  // Convert taskId to number to ensure consistency
  const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  
  // Broadcast the field update with standard payload structure
  WebSocketService.broadcast('field_update', {
    taskId: numericTaskId,
    fieldKey,
    value,
    fieldId: fieldId || null,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Progress Utils] Broadcasting field update for task ${numericTaskId}, field ${fieldKey}:`, {
    value: value ? (value.length > 50 ? `${value.substring(0, 47)}...` : value) : '(empty)',
    fieldId: fieldId || 'N/A',
    timestamp: new Date().toISOString()
  });
}

/**
 * Standardized submission status broadcast
 * 
 * This function broadcasts a form submission status update to all WebSocket clients
 * for consistent submission handling feedback.
 * 
 * @param taskId Task ID
 * @param status Submission status (success, error, etc.)
 * @param details Optional details about the submission
 */
export function broadcastSubmissionStatus(
  taskId: number | string, 
  status: 'success' | 'error' | 'in_progress',
  details: Record<string, any> = {}
) {
  // Convert taskId to number to ensure consistency
  const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  
  // Broadcast the submission status
  WebSocketService.broadcast('submission_status', {
    taskId: numericTaskId,
    status,
    ...details,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Progress Utils] Broadcasting submission status for task ${numericTaskId}:`, {
    status,
    details: Object.keys(details).length > 0 ? details : '(none)',
    timestamp: new Date().toISOString()
  });
}

/**
 * Determine the appropriate task status based on progress value
 * 
 * @param progress Current progress value (0-100)
 * @param currentStatus Current task status
 * @param formResponses Optional form responses to check for required fields
 * @param metadata Optional task metadata to check for submission date
 * @returns Updated task status
 */
export /**
 * Determine task status based on progress and other factors
 * 
 * This function uses the centralized task-status-determiner utility
 * to ensure consistent status determination across all parts of the application.
 * 
 * @param progress Task progress (0-100)
 * @param currentStatus Current task status
 * @param formResponses Optional form responses for additional validation
 * @param metadata Optional task metadata
 * @returns Determined task status
 */
function determineStatusFromProgress(
  progress: number, 
  currentStatus: TaskStatus,
  formResponses?: Array<{ status: string; hasValue: boolean; required?: boolean; field?: string }>,
  metadata?: Record<string, any>
): TaskStatus {
  // Handle special case for required fields
  // If form responses are provided, check if ANY required fields are empty
  if (formResponses && formResponses.length > 0) {
    const hasCompletedRequiredFields = hasAllRequiredFields(formResponses);
    
    // Always use in_progress if required fields are empty, regardless of % completion
    if (!hasCompletedRequiredFields) {
      console.log(`[STATUS DETERMINATION] Task has incomplete required fields, setting to IN_PROGRESS`);
      return TaskStatus.IN_PROGRESS;
    }
  }
  
  // Use the centralized task status determiner
  return determineTaskStatus({
    progress,
    currentStatus,
    hasSubmissionDate: !!metadata?.submissionDate,
    hasSubmittedFlag: metadata?.status === 'submitted' || metadata?.explicitlySubmitted === true,
    hasResponses: !!(formResponses && formResponses.length > 0),
    metadata
  });
}

/**
 * Standardized function to update task progress and broadcast changes
 * 
 * @param taskId Task ID
 * @param progress New progress value (0-100)
 * @param status Optional status override
 * @param metadata Optional metadata to include
 * @param options Optional configuration
 */
/**
 * Universal Task Progress Calculator
 * 
 * This centralized function calculates task progress consistently across all form types
 * by counting COMPLETE fields and dividing by total fields, using Math.round() for percentage.
 * 
 * @param taskId Task ID to calculate progress for
 * @param taskType Type of task ('kyb', 'ky3p', 'open_banking')
 * @param options Optional configuration including transaction for atomic operations
 * @returns Promise<number> Progress percentage (0-100)
 */
/**
 * Calculate universal task progress across different task types
 *
 * This function implements a standardized way to calculate progress
 * for all task types. It can use a transaction for atomic operations.
 *
 * @param taskId Task ID
 * @param taskType Type of task (company_kyb, ky3p, open_banking)
 * @param options Configuration options including transaction context
 * @returns Promise<number> Progress percentage (0-100)
 */
/**
 * EXTENDED DIAGNOSTIC VERSION: Universal Task Progress Calculator with detailed logging
 * 
 * This enhanced version includes additional diagnostic information to track down
 * inconsistencies in progress calculation.
 */
export async function calculateUniversalTaskProgress(
  taskId: number,
  taskType: string,
  options: { tx?: any; debug?: boolean; diagnosticId?: string } = {}
): Promise<number> {
  // Generate a unique diagnostic ID for tracking this specific calculation through logs
  const diagnosticId = options.diagnosticId || `prog-calc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logPrefix = `[Universal Progress ${diagnosticId}]`;
  let totalFields = 0;
  let completedFields = 0;
  const debug = options.debug || false;
  
  // Use the passed transaction context or the global db instance
  const dbContext = options.tx || db;
  
  // Starting a new progress calculation - log so we can track it
  console.log(`${logPrefix} Starting progress calculation for task ${taskId} (${taskType}):`, {
    timestamp: new Date().toISOString(),
    calculationId: diagnosticId,
    taskId,
    taskType,
    debug,
    usingTransaction: !!options.tx,
    source: new Error().stack?.split('\n')[2]?.trim() || 'unknown'
  });
  
  try {
    // Use the appropriate schema and table based on task type
    if (taskType === 'open_banking') {
      // Count total Open Banking fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed Open Banking responses (with status = COMPLETE)
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            // Match status value directly using the standardized FieldStatus enum
            eq(openBankingResponses.status, FieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (taskType === 'ky3p' || taskType === 'security' || taskType === 'sp_ky3p_assessment' || taskType === 'security_assessment') {
      // Count total KY3P fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KY3P responses (with status = COMPLETE)
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            // Match status value directly using the standardized FieldStatus enum
            eq(ky3pResponses.status, FieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
      
      // DIAGNOSTIC: Log detailed KY3P progress calculation
      console.log(`[ProgressDebug] KY3P detailed calculation for task ${taskId}:`, {
        totalFields,
        completedFields,
        rawPercentage: totalFields > 0 ? (completedFields / totalFields) * 100 : 0,
        roundedPercentage: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
        timestamp: new Date().toISOString(),
        statusEnumValue: FieldStatus.COMPLETE,
        queryCondition: 'Using standardized FieldStatus.COMPLETE enum value for consistent status handling'
      });
      
      // DIAGNOSTIC: Log the completed responses
      const detailedResponses = await dbContext
        .select()
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      console.log(`[ProgressDebug] KY3P responses for task ${taskId}:`, {
        responseCount: detailedResponses.length,
        completeCount: detailedResponses.filter((r: any) => r.status === FieldStatus.COMPLETE).length,
        incompleteCount: detailedResponses.filter((r: any) => r.status !== FieldStatus.COMPLETE).length,
        statuses: detailedResponses.map((r: any) => r.status),
        timestamp: new Date().toISOString()
      });
    }
    else { 
      // Default to KYB fields (company_kyb type)
      // Count total KYB fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KYB responses
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            // Match status value directly using the standardized FieldStatus enum
            eq(kybResponses.status, FieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    
    // Calculate progress percentage using Math.round for consistency
    // This ensures all task types use the exact same calculation method
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    // Always log progress calculation results at this diagnostic level
    console.log(`${logPrefix} Calculation result: ${completedFields}/${totalFields} = ${progressPercentage}%`, {
      taskId,
      taskType,
      totalFields,
      completedFields,
      progressPercentage,
      calculationMethod: 'FIXED-ENUM-BASED', // Tracking that we're using the new fixed method
      timestamp: new Date().toISOString(),
      diagnosticId
    });
    
    // Apply progress protection for read-only operations (not during transactions)
    // This ensures progress calculations don't incorrectly show a lower value
    // without actually updating the database
    if (!options.tx) {
      try {
        // Import validateProgressUpdate from the progress-protection module using top-level import
        // Skip progress protection for now since we're focusing on standardizing status determination
        // We'll come back to this later
        /* 
        const validatedReadOnlyProgress = await validateProgressUpdate(taskId, progressPercentage, {
          allowDecrease: false,
          // Don't force update since this is a read-only operation
          forceUpdate: false
        });
        
        if (validatedReadOnlyProgress !== progressPercentage) {
          console.log(`${logPrefix} Progress protection applied during read-only calculation:`, {
            originalProgress: progressPercentage,
            protectedProgress: validatedReadOnlyProgress,
            taskId,
            taskType,
            timestamp: new Date().toISOString(),
            diagnosticId
          });
          return validatedReadOnlyProgress;
        }
        */
      } catch (protectionError) {
        // If protection fails, log but continue with original value
        console.error(`${logPrefix} Error applying progress protection:`, protectionError);
      }
    }
    
    return progressPercentage;
  } catch (error) {
    console.error(`${logPrefix} Error calculating universal task progress:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Update Task Progress
 * 
 * Atomic function to update a task's progress in the database and broadcast the update
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task for progress calculation
 * @param options Optional configuration
 * @returns Promise<void>
 */
/**
 * Update task progress with transaction support for atomic operations
 * 
 * This function calculates the current progress for a task and updates it in the database
 * using a transaction to ensure consistency. It also broadcasts the update to all connected clients.
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task (company_kyb, ky3p, open_banking)
 * @param options Configuration options
 * @returns Promise<any> Returns the updated task object or void
 */
/**
 * ENHANCED DIAGNOSTIC VERSION: Update Task Progress with detailed tracking
 * 
 * This enhanced version includes additional diagnostic information to track down
 * inconsistencies in progress calculation and updates.
 */
export async function updateTaskProgress(
  taskId: number,
  taskType: string,
  options: { 
    forceUpdate?: boolean; 
    skipBroadcast?: boolean; 
    debug?: boolean;
    allowDecrease?: boolean; // Whether to allow progress to decrease
    metadata?: Record<string, any>;
    diagnosticId?: string; // Tracking ID for this specific update
    source?: string; // Where this update was triggered from
  } = {}
): Promise<any> {
  const { forceUpdate = false, skipBroadcast = false, debug = false, metadata = {} } = options;
  const logPrefix = '[Task Progress Update]';
  
  // Add transaction ID for tracing in logs outside try block
  // so it's available in the catch block as well
  const transactionId = `txid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Declare variables for closure in catch block
  let storedProgress = 0;
  let newProgress = 0;
  
  // Add retry logic for small progress changes to ensure they're not lost
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  // Function to add a small delay between retries
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Nested async function for retry capabilities
  async function executeProgressUpdate() {
    try {
      // Using transaction for atomic operations
      // Add explicit logging for transaction start/commit
      console.log(`${logPrefix} Starting transaction for task ${taskId} (${taskType}) - Attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);
      console.log(`${logPrefix} Transaction ${transactionId} started for task ${taskId}`);
      
      const result = await db.transaction(async (tx) => {
        // Step 1: Get the current task with transaction
        const [task] = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
          
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        // Step 2: Calculate the accurate progress using our universal function
        const calculatedProgress = await calculateUniversalTaskProgress(taskId, taskType, { debug, tx });
        
        // Step 3: Check if update is needed with proper type conversion
        // Update outer scope variables for access in catch block
        storedProgress = Number(task.progress);
        newProgress = Number(calculatedProgress);
        
        // Add extensive debugging
        console.log(`${logPrefix} PROGRESS DEBUG - Task ${taskId} (${taskType}):\n` +
          `  - Stored progress: ${task.progress} (${typeof task.progress})\n` +
          `  - New progress: ${calculatedProgress} (${typeof calculatedProgress})\n` +
          `  - As numbers: ${storedProgress} vs ${newProgress}\n` +
          `  - Force update: ${forceUpdate}\n` +
          `  - Would ${storedProgress === newProgress ? 'NOT' : ''} update progress`);
        
        // CRITICAL FIX: Always force an update in the following cases:
        // 1. If the calculated progress is greater than 0 and stored is 0 (zero-to-non-zero)
        // 2. If forceUpdate flag is set to true (explicit force update request)
        // 3. If there's a small but meaningful progress change (under 5%)
        const isZeroToNonZero = (storedProgress === 0 && newProgress > 0);
        const isSmallProgressChange = (Math.abs(newProgress - storedProgress) > 0 && Math.abs(newProgress - storedProgress) < 5);
        
        if (isZeroToNonZero) {
          console.log(`${logPrefix} Forcing update due to zero-to-non-zero progress change: 0% -> ${newProgress}%`);
        }
        
        if (isSmallProgressChange) {
          console.log(`${logPrefix} Forcing update due to small but meaningful progress change: ${storedProgress}% -> ${newProgress}%`);
        }
        
        // Only skip the update if ALL of these conditions are true:
        // 1. No force update requested
        // 2. Not a zero-to-non-zero change
        // 3. Not a small progress change
        // 4. The progress values are exactly equal
        // 5. Both values are valid numbers
        if (!forceUpdate && 
            !isZeroToNonZero &&
            !isSmallProgressChange &&
            storedProgress === newProgress && 
            !isNaN(storedProgress) && 
            !isNaN(newProgress)) {
          if (debug) {
            console.log(`${logPrefix} No progress change needed for task ${taskId} (${taskType}): ${calculatedProgress}%`);
          }
          return null; // Indicate no update needed
        }
        
        // Log progress change for debugging purposes
        if (debug) {
          console.log(`${logPrefix} Progress change detected for task ${taskId} (${taskType}):`, {
            stored: storedProgress,
            calculated: newProgress,
            storedType: typeof task.progress,
            calculatedType: typeof calculatedProgress
          });
        }
        
        // Step 4: Determine the appropriate status based on progress
        const newStatus = determineStatusFromProgress(
          calculatedProgress,
          task.status as TaskStatus,
          [], // No formResponses needed since we're using the calculated progress
          { ...task.metadata, ...metadata }
        );
        
        if (debug) {
          console.log(`${logPrefix} Updating task ${taskId} (${taskType}):`, {
            progressFrom: task.progress,
            progressTo: calculatedProgress,
            statusFrom: task.status,
            statusTo: newStatus
          });
        }
        
        // Import the progress protection module is already done at the top level
        // Commented out for now as we focus on standardizing status determination
        /*
        // Step 5: Validate the progress to prevent regressions
        const validatedProgress = await validateProgressUpdate(taskId, Number(calculatedProgress), {
          forceUpdate: options.forceUpdate,
          allowDecrease: options.allowDecrease
        });
        */
        // For now, just use the calculated progress directly
        const validatedProgress = Number(calculatedProgress);
        
        // Log if progress validation modified the value
        if (validatedProgress !== Number(calculatedProgress)) {
          console.log(`${logPrefix} Progress protection applied:`, {
            originalProgress: Number(calculatedProgress),
            protectedProgress: validatedProgress,
            difference: validatedProgress - Number(calculatedProgress),
            taskId,
            timestamp: new Date().toISOString(),
            transactionId
          });
        }
        
        // Step 6: Update the task with validated progress and status using the transaction
        const [updatedTask] = await tx
          .update(tasks)
          .set({
            progress: validatedProgress, // Use the validated progress value
            status: newStatus,
            updated_at: new Date(),
            metadata: {
              ...task.metadata,
              ...metadata,
              lastProgressUpdate: new Date().toISOString(),
              progressHistory: [
                ...(task.metadata?.progressHistory || []),
                { value: validatedProgress, timestamp: new Date().toISOString() }
              ].slice(-10) // Keep last 10 progress updates
            }
          })
          .where(eq(tasks.id, taskId))
          .returning();
          
        // Log successful update transaction
        console.log(`${logPrefix} Transaction ${transactionId}: Successfully updated task ${taskId} progress from ${storedProgress}% to ${newProgress}%`, {
          taskId,
          taskType,
          oldProgress: storedProgress,
          newProgress,
          statusChange: `${task.status} -> ${newStatus}`,
          updated: new Date().toISOString(),
          forceUpdateRequested: forceUpdate,
          isSmallChange: isSmallProgressChange,
          isZeroToNonZero
        });
        
        // Return updated task data if needed for further processing
        return updatedTask;
      });
      
      // Log successful transaction completion outside transaction
      console.log(`${logPrefix} Transaction ${transactionId} completed successfully for task ${taskId} (${taskType})`);
      
      // After successful transaction completion, broadcast the update if needed
      if (!skipBroadcast && result) {
        // Broadcasting is done outside of transaction as it doesn't require rollback
        setTimeout(() => {
          // Pass diagnostic ID for end-to-end tracking
          broadcastProgressUpdate(
            taskId,
            newProgress,
            result.status as TaskStatus,
            result.metadata || {},
            options.diagnosticId || `update-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          );
        }, 0);
      }
      
      return result;
    } catch (error) {
      console.error(`${logPrefix} Error updating task progress:`, error);
      
      // Add detailed error information for troubleshooting
      console.error(`${logPrefix} Failed transaction details for ${transactionId}:`, {
        taskId,
        taskType,
        forceUpdate,
        retryCount,
        maxRetries: MAX_RETRIES,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
      
      // Determine if we should retry based on the error and retry count
      const isRetriableError = error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('deadlock') ||
        error.message.includes('conflict') ||
        error.message.includes('serialization')
      );
      
      const isSmallProgressUpdate = newProgress > 0 && newProgress < 5;
      const shouldRetry = (retryCount < MAX_RETRIES) && (isRetriableError || isSmallProgressUpdate);
      
      if (shouldRetry) {
        retryCount++;
        console.log(`${logPrefix} Retrying transaction (${retryCount}/${MAX_RETRIES}) for small progress update after error:`, {
          taskId,
          taskType,
          progress: newProgress,
          errorType: error instanceof Error ? error.message : 'Unknown error',
          delayMs: 500 * retryCount
        });
        
        // Add exponential backoff delay between retries
        await sleep(500 * retryCount);
        return executeProgressUpdate();
      }
      
      // If we're not retrying or have exhausted retries, rethrow the error
      throw error;
    }
  }
  
  // Start the actual execution - this allows us to use retry logic
  return executeProgressUpdate();
}

/**
 * Enhanced WebSocket broadcast for task progress updates with detailed monitoring
 *
 * This function broadcasts progress updates to all connected WebSocket clients
 * with enhanced monitoring to diagnose inconsistencies.
 * 
 * @param taskId Task ID to broadcast progress update for
 * @param progress Progress value (0-100)
 * @param status Optional task status
 * @param metadata Optional metadata to include
 * @param diagnosticId Optional tracking ID
 * @param options Additional configuration options
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status?: TaskStatus,
  metadata?: Record<string, any>,
  diagnosticId?: string,
  options: { forceUpdate?: boolean; ignoreSkipCheck?: boolean } = {}
) {
  // Generate a unique diagnostic ID for tracking this broadcast through logs
  const broadcastId = diagnosticId || `broadcast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Log the broadcast attempt with detailed information
  console.log(`[Progress Broadcast ${broadcastId}] Broadcasting progress update for task ${taskId}:`, {
    taskId,
    progress,
    status,
    timestamp: new Date().toISOString(),
    // Track where the broadcast was triggered from
    source: new Error().stack?.split('\n')[2]?.trim() || 'unknown',
    hasMetadata: !!metadata
  });
  // Check if reconciliation is disabled for this task (e.g. during clearing operations)
  // This helps to prevent WebSocket spam during bulk operations like clearing all fields
  if (!options.ignoreSkipCheck) {
    const skipUntil = global.__skipTaskReconciliation?.[taskId] || 0;
    if (skipUntil > Date.now()) {
      // Skip the broadcast if this task is locked for reconciliation
      console.log(`[Progress Utils] Skipping broadcast for task ${taskId} due to temporary lock until ${new Date(skipUntil).toISOString()}`);
      return;
    }
  }
  // Validate the progress value
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // If metadata has submission indicators, always use SUBMITTED status
  let finalStatus = status;
  if (metadata?.submissionDate) {
    finalStatus = TaskStatus.SUBMITTED;
    console.log(`[Progress Utils] Task has submissionDate, overriding status to SUBMITTED`);
  } else if (metadata?.status === 'submitted' || metadata?.explicitlySubmitted === true) {
    finalStatus = TaskStatus.SUBMITTED;
    console.log(`[Progress Utils] Task has submission flags in metadata, overriding status to SUBMITTED`);
    console.log(`[Progress Utils] Metadata submission flags:`, { 
      status: metadata?.status,
      explicitlySubmitted: metadata?.explicitlySubmitted,
      submittedAt: metadata?.submittedAt 
    });
  } 
  // If no explicit status is provided, determine based on progress
  else if (!finalStatus) {
    if (validatedProgress === 0) {
      finalStatus = TaskStatus.NOT_STARTED;
      console.log(`[Progress Utils] Setting status to NOT_STARTED based on 0% progress`);
    } else if (validatedProgress < 100) {
      finalStatus = TaskStatus.IN_PROGRESS;
      console.log(`[Progress Utils] Setting status to IN_PROGRESS based on ${validatedProgress}% progress`);
    } else if (validatedProgress === 100) {
      finalStatus = TaskStatus.READY_FOR_SUBMISSION;
      console.log(`[Progress Utils] Setting status to READY_FOR_SUBMISSION based on 100% progress`);
    }
  }
  
  // Log the broadcast action with detailed information
  console.log('[Progress Utils] Broadcasting task progress update:', {
    taskId,
    progress: validatedProgress,
    requestedStatus: status,
    finalStatus,
    hasSubmissionDate: !!metadata?.submissionDate,
    hasSubmittedFlag: metadata?.status === 'submitted',
    timestamp: new Date().toISOString()
  });
  
  try {
    // WebSocket monitor is disabled temporarily to focus on status standardization
    /* 
    // Track this progress update for monitoring
    trackProgressBroadcast(
      taskId,
      validatedProgress,
      String(finalStatus || status || TaskStatus.IN_PROGRESS),
      metadata,
      new Error().stack?.split('\n')[2]?.trim() || 'unknown',
      broadcastId
    );
    */
  } catch (monitorError) {
    // If monitoring fails, log but continue with broadcast
    console.error(`[Progress Utils] Error tracking progress broadcast:`, monitorError);
  }
  
  // Broadcast the update to all connected clients with the appropriate status
  try {
    WebSocketService.broadcast('task_update', {
      id: taskId,
      status: finalStatus || status || TaskStatus.IN_PROGRESS,
      progress: validatedProgress,
      metadata: metadata || {},
      diagnosticId: broadcastId // Include the diagnostic ID for end-to-end tracking
    });
    
    console.log(`[Progress Broadcast ${broadcastId}] Successfully broadcast progress update for task ${taskId}`);
  } catch (broadcastError) {
    console.error(`[Progress Broadcast ${broadcastId}] Error broadcasting progress update:`, broadcastError);
  }
}