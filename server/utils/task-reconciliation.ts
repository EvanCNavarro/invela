import { eq, and, or, sql } from 'drizzle-orm';
import { db } from "@db";
import { 
  tasks, 
  kybResponses, 
  kybFields, 
  ky3pResponses, 
  ky3pFields, 
  openBankingResponses, 
  openBankingFields,
  KYBFieldStatus  // Import the enum for status values
} from "@db/schema";
import { TaskStatus } from '../types';
import { calculateKybFormProgress } from './kyb-progress';
import { determineStatusFromProgress, broadcastProgressUpdate } from './progress';
import { fixTaskSubmittedStatus } from '../middleware/task-status';

/**
 * Calculate a task's progress directly from the database
 * 
 * This function calculates the accurate progress percentage for a task
 * by counting the actual completed responses in the database
 * 
 * @param taskId Task ID to calculate progress for
 * @param taskType Type of task ('kyb', 'ky3p', 'open_banking')
 * @returns Promise<number> Progress percentage (0-100)
 */
export async function calculateTaskProgressFromDB(
  taskId: number,
  taskType: string
): Promise<number> {
  const logPrefix = '[Task Progress]';
  let totalFields = 0;
  let completedFields = 0;
  
  try {
    if (taskType === 'open_banking') {
      // Count total Open Banking fields
      const totalFieldsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed Open Banking responses
      const completedResultQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            // Handle both upper and lowercase status values
            sql`UPPER(${openBankingResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (taskType === 'ky3p') {
      // FIXED: Count only fields that have responses for THIS specific task
      // instead of all fields in the database, making KY3P work just like KYB
      const totalFieldsResult = await db
        .select({ count: sql<number>`count(DISTINCT ${ky3pResponses.field_id})` })
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      totalFields = totalFieldsResult[0].count;
      
      // If no responses exist yet, set totalFields to 1 to avoid division by zero
      // and to ensure progress is 0% when no fields have been answered
      if (totalFields === 0) {
        totalFields = 1;
      }
      
      // Count completed KY3P responses with non-empty values
      const completedResultQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            // Handle both uppercase and lowercase status values
            sql`UPPER(${ky3pResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    else { 
      // Default to KYB fields (company_kyb type)
      // Count total KYB fields
      const totalFieldsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KYB responses with non-empty values
      const completedResultQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            // Handle both uppercase and lowercase status values for maximum compatibility
            sql`UPPER(${kybResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    
    // Calculate progress percentage (0-100)
    // Use Math.round for most accurate and user-friendly progress display
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100)) 
      : 0;
    
    console.log(`${logPrefix} Calculated progress for task ${taskId} (${taskType}): ${completedFields}/${totalFields} = ${progressPercentage}%`);
    return progressPercentage;
  } catch (error) {
    console.error(`${logPrefix} Error calculating task progress:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

// Add typings for the global skip reconciliation object
declare global {
  var __skipTaskReconciliation: Record<number, number> | undefined;
}

/**
 * Reconcile task progress across the system to ensure consistency
 * 
 * This function ensures that a task's progress and status accurately reflect
 * the state of its form data in the database
 * 
 * @param taskId Task ID to reconcile
 * @param options Optional configuration
 * @returns Promise<void>
 */
export async function reconcileTaskProgress(
  taskId: number,
  options: { forceUpdate?: boolean; debug?: boolean } = {}
): Promise<void> {
  const { forceUpdate = false, debug = false } = options;
  const logPrefix = '[Task Reconciliation]';
  
  try {
    // ENHANCED: More aggressive skip mechanism to prevent cascading WebSocket messages
    // This is critical for operations like "clear all fields" which need to prevent update storms
    const skipUntil = global.__skipTaskReconciliation?.[taskId] || 0;
    
    // Skip if this task is locked for reconciliation
    if (skipUntil > Date.now()) {
      // Always log skips (not just in debug mode) to help diagnose performance issues
      console.log(`${logPrefix} Skipping reconciliation for task ${taskId} due to temporary lock until ${new Date(skipUntil).toISOString()}`);
      
      // Check if we need to extend the lock based on continuous reconciliation attempts
      // If we are getting a reconciliation request while already locked, extend the lock
      // This prevents cascading reconciliation attempts from piling up and triggering as soon as lock expires
      if (Date.now() + 10000 > skipUntil) { // If we're within 10 seconds of lock expiring
        global.__skipTaskReconciliation = global.__skipTaskReconciliation || {};
        global.__skipTaskReconciliation[taskId] = Date.now() + 30000; // Extend lock by 30 seconds
        console.log(`${logPrefix} Extended reconciliation lock for task ${taskId} due to continued attempts`);
      }
      
      // Exit early - don't even attempt to check the task status
      return;
    }
    
    // 1. Fetch the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.warn(`${logPrefix} Task not found:`, taskId);
      return;
    }

    // 2. Skip reconciliation for terminal states, NEVER allow recalculation for submitted forms
    const terminalStates = [TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED];
    
    // ENHANCED FIX: Comprehensive check for submission indicators in various metadata fields
    // This ensures we detect ALL submitted tasks regardless of which field was used to mark submission
    const hasSubmissionDate = task.metadata?.submissionDate !== undefined || task.metadata?.submission_date !== undefined;
    const hasSubmittedFlag = task.metadata?.submitted === true || task.metadata?.explicitlySubmitted === true || 
      (task.metadata?.status === 'submitted') || (task.metadata?.submission_info?.submitted === true);
    const hasFileId = task.metadata?.submissionFileId !== undefined || task.metadata?.fileId !== undefined;
    
    // Consider ANY submission indicator as evidence of submission
    const hasBeenSubmitted = hasSubmissionDate || hasSubmittedFlag || hasFileId || task.status === TaskStatus.SUBMITTED;
    
    // Detailed logging of submission indicators for debugging
    if (debug) {
      console.log(`${logPrefix} Task submission indicators:`, {
        taskId,
        status: task.status,
        progress: task.progress,
        hasSubmissionDate,
        hasSubmittedFlag,
        hasFileId,
        submissionDate: task.metadata?.submissionDate || task.metadata?.submission_date,
        isTerminalState: terminalStates.includes(task.status as TaskStatus),
        hasBeenSubmitted
      });
    }
    
    if (terminalStates.includes(task.status as TaskStatus) || hasBeenSubmitted) {
      if (debug) {
        console.log(`${logPrefix} Skipping task in terminal/submitted state:`, {
          taskId,
          status: task.status,
          hasSubmissionDate,
          hasSubmittedFlag,
          hasFileId,
          submissionDate: task.metadata?.submissionDate || task.metadata?.submission_date,
          terminalState: terminalStates.includes(task.status as TaskStatus)
        });
      }
      
      // If task is submitted but progress is not 100% or status doesn't reflect submission, fix it
      const needsFixing = hasBeenSubmitted && (
        !terminalStates.includes(task.status as TaskStatus) || 
        task.progress !== 100
      );
      
      if (needsFixing) {
        console.log(`${logPrefix} Task has been submitted but status/progress is incorrect. Fixing:`, {
          taskId,
          currentStatus: task.status,
          currentProgress: task.progress,
          correctStatus: TaskStatus.SUBMITTED,
          correctProgress: 100
        });
        
        // Use our dedicated function to fix task submission status
        const fixed = await fixTaskSubmittedStatus(taskId);
        
        if (fixed) {
          console.log(`${logPrefix} Task ${taskId} fixed to SUBMITTED status with 100% progress`);
        } else {
          console.log(`${logPrefix} Unable to fix task ${taskId} status, using fallback method`);
          
          // Fallback method - directly set the status and ensure 100% progress
          await db.update(tasks)
            .set({
              status: TaskStatus.SUBMITTED,
              progress: 100, // Always set to 100% for submitted tasks
              updated_at: new Date(),
              metadata: {
                ...task.metadata,
                status: 'submitted', // Add explicit status flag
                submitted: true,     // Add explicit submitted flag
                lastStatusUpdate: new Date().toISOString()
              }
            })
            .where(eq(tasks.id, taskId));
            
          // Broadcast the corrected status with 100% progress
          broadcastProgressUpdate(
            taskId,
            100,
            TaskStatus.SUBMITTED,
            {
              ...task.metadata,
              submissionDate: task.metadata?.submissionDate || task.metadata?.submission_date,
              status: 'submitted',
              submitted: true
            }
          );
        }
      }
      
      return;
    }
    
    // 3. Check what type of task we're dealing with
    const taskType = task.task_type;
    let responses: {
      response_value: string | null;
      field_key: string;
      status: string;
      field_id: number;
      required: boolean | null;
    }[] = [];

    // Check the task type and fetch appropriate responses
    if (taskType === 'open_banking') {
      try {
        // Fetch Open Banking responses
        console.log(`${logPrefix} Fetching Open Banking responses for task ${taskId}`);
        
        // For Open Banking, we should always recalculate the progress directly from the database
        // to ensure consistency between form and task center views
        
        // Count total fields
        const totalFieldsResult = await db
          .select({
            count: sql<number>`count(*)`
          })
          .from(openBankingFields);
        
        const totalFields = totalFieldsResult[0].count;
        
        // Count completed responses (complete status)
        const completedResponsesResult = await db
          .select({
            count: sql<number>`count(*)`
          })
          .from(openBankingResponses)
          .where(
            and(
              eq(openBankingResponses.task_id, taskId),
              // Use UPPER function to handle both capitalization variants consistently
              sql`UPPER(${openBankingResponses.status}) = 'COMPLETE'`
            )
          );
        
        // Extract the completed fields count
        const completedFields = completedResponsesResult[0]?.count || 0;
        
        // Calculate accurate progress percentage
        const calculatedProgress = 
          totalFields > 0 && completedFields > 0
            ? Math.min(100, Math.max(1, Math.ceil((completedFields / totalFields) * 100)))
            : 0;
            
        console.log(`${logPrefix} Recalculated Open Banking progress:`, {
          taskId,
          totalFields,
          completedFields,
          currentProgress: task.progress,
          calculatedProgress
        });
        
        // If progress differs, update the task and broadcast
        if (forceUpdate || task.progress !== calculatedProgress) {
          // CONSISTENT STATUS DETERMINATION:
          // Strictly follow the business rules:
          // 0% = Not Started
          // 1-99% = In Progress
          // 100% (not submitted) = Ready for Submission
          // 100% (submitted) = Submitted
          const newStatus = 
            calculatedProgress === 0 ? TaskStatus.NOT_STARTED :
            calculatedProgress >= 100 ? TaskStatus.READY_FOR_SUBMISSION :
            TaskStatus.IN_PROGRESS;
            
          console.log(`${logPrefix} Updating Open Banking task progress:`, {
            taskId,
            progressFrom: task.progress,
            progressTo: calculatedProgress,
            statusFrom: task.status,
            statusTo: newStatus
          });
          
          // Update task in database
          const [updatedTask] = await db.update(tasks)
            .set({
              progress: calculatedProgress,
              status: newStatus,
              updated_at: new Date(),
              metadata: {
                ...task.metadata,
                lastProgressReconciliation: new Date().toISOString()
              }
            })
            .where(eq(tasks.id, taskId))
            .returning();
          
          // Broadcast the update to all connected clients
          broadcastProgressUpdate(
            taskId,
            calculatedProgress,
            newStatus,
            updatedTask.metadata || {}
          );
        }
        
        // Exit early since we've handled everything for Open Banking
        return;
      } catch (error) {
        console.error(`${logPrefix} Error fetching Open Banking responses:`, error);
        // Fall back to empty responses
        responses = [];
      }
    } else if (taskType === 'ky3p') {
      try {
        // IMPROVED: Use the unified progress calculation with transaction boundaries
        // to ensure proper persistence for KY3P tasks
        console.log(`${logPrefix} Using improved unified progress calculation for KY3P task ${taskId}`);
        
        // Import the fixed version of the progress calculator
        // Note: We're importing here to avoid circular dependencies
        const { calculateAndUpdateTaskProgress } = await import('./ky3p-progress.utils');
        
        // Use the fixed implementation with proper transaction boundaries
        const result = await calculateAndUpdateTaskProgress(taskId, {
          debug: true,
          force: forceUpdate,
          source: 'task_reconciliation'
        });
        
        console.log(`${logPrefix} KY3P progress update result:`, {
          taskId,
          success: result.success,
          progress: result.progress,
          status: result.status,
          message: result.message
        });
        
        // The calculateAndUpdateTaskProgress function handles everything:
        // - Database update with proper transaction boundaries
        // - Progress calculation
        // - Status determination
        // - WebSocket broadcasting
        
        // Exit early since we've handled everything for KY3P
        return;
      } catch (error) {
        console.error(`${logPrefix} Error fetching KY3P responses:`, error);
        console.error(error);
        // Fall back to empty responses
        responses = [];
      }
    } else {
      // Default to KYB responses (for company_kyb type)
      responses = await db.select({
        response_value: kybResponses.response_value,
        field_key: kybFields.field_key,
        status: kybResponses.status,
        field_id: kybResponses.field_id,
        required: kybFields.required
      })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));
    }
    
    if (debug) {
      console.log(`${logPrefix} Found ${responses.length} responses for task ${taskId} (type: ${taskType})`);
    }
    
    // 4. Build the response array in the format expected by our utilities
    const formattedResponses = responses.map((response) => {
      // Normalize the status value to ensure consistent capitalization
      const normalizedStatus = response.response_value 
        ? KYBFieldStatus.COMPLETE.toUpperCase()  // Use enum value but convert to uppercase for consistency
        : KYBFieldStatus.EMPTY.toUpperCase();    // Use enum value but convert to uppercase for consistency
        
      return {
        field: response.field_key,
        status: normalizedStatus,
        hasValue: !!response.response_value,
        required: !!response.required
      };
    });
    
    // 5. Calculate accurate progress - percentage of completed fields
    const calculatedProgress = calculateKybFormProgress(formattedResponses, formattedResponses);
    
    // 6. Determine correct status based on progress, required fields, and metadata
    const calculatedStatus = determineStatusFromProgress(
      calculatedProgress, 
      task.status as TaskStatus,
      formattedResponses,
      task.metadata || undefined // Pass the task metadata to check for submissionDate
    );
    
    if (debug) {
      console.log(`${logPrefix} Progress calculation:`, {
        taskId,
        currentProgress: task.progress,
        calculatedProgress,
        currentStatus: task.status,
        calculatedStatus,
        responseCount: responses.length,
        completeCount: formattedResponses.filter(r => r.status.toUpperCase() === KYBFieldStatus.COMPLETE.toUpperCase() && r.hasValue).length
      });
    }
    
    // 7. Update task if values differ or force update is specified
    if (forceUpdate || task.progress !== calculatedProgress || task.status !== calculatedStatus) {
      console.log(`${logPrefix} Correcting task ${taskId}:`, {
        progressFrom: task.progress,
        progressTo: calculatedProgress,
        statusFrom: task.status,
        statusTo: calculatedStatus,
        forceUpdate
      });
      
      // Update task in database
      const [updatedTask] = await db.update(tasks)
        .set({
          progress: calculatedProgress,
          status: calculatedStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            lastProgressReconciliation: new Date().toISOString()
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      // 8. Broadcast the update to all connected clients
      broadcastProgressUpdate(
        taskId,
        calculatedProgress,
        calculatedStatus as TaskStatus,
        updatedTask.metadata || {}
      );
      
      return;
    }
    
    if (debug) {
      console.log(`${logPrefix} No updates needed for task ${taskId}`);
    }
  } catch (error) {
    console.error(`${logPrefix} Error reconciling task progress:`, error);
  }
}