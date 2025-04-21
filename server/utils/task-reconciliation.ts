import { eq, and, or } from 'drizzle-orm';
import { db } from "@db";
import { tasks, kybResponses, kybFields, openBankingResponses, openBankingFields } from "@db/schema";
import { TaskStatus } from '../types';
import { calculateKybFormProgress } from './kyb-progress';
import { determineStatusFromProgress, broadcastProgressUpdate } from './progress';
import { fixTaskSubmittedStatus } from '../middleware/task-status';

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
    
    // Check metadata for submission date - if it exists, this form has been submitted
    const hasBeenSubmitted = task.metadata?.submissionDate !== undefined;
    
    if (terminalStates.includes(task.status as TaskStatus) || hasBeenSubmitted) {
      if (debug) {
        console.log(`${logPrefix} Skipping task in terminal/submitted state:`, {
          taskId,
          status: task.status,
          hasSubmissionDate: hasBeenSubmitted,
          submissionDate: task.metadata?.submissionDate,
          terminalState: terminalStates.includes(task.status as TaskStatus)
        });
      }
      
      // If task is submitted but status doesn't reflect that, fix it
      if (hasBeenSubmitted && !terminalStates.includes(task.status as TaskStatus)) {
        console.log(`${logPrefix} Task has been submitted but status is incorrect. Fixing:`, {
          taskId,
          currentStatus: task.status,
          correctStatus: TaskStatus.SUBMITTED
        });
        
        // Use our dedicated function to fix task submission status
        const fixed = await fixTaskSubmittedStatus(taskId);
        
        if (fixed) {
          console.log(`${logPrefix} Task ${taskId} fixed to SUBMITTED status`);
        } else {
          console.log(`${logPrefix} Unable to fix task ${taskId} status, using fallback method`);
          
          // Fallback method - directly set the status
          await db.update(tasks)
            .set({
              status: TaskStatus.SUBMITTED,
              progress: 100,
              updated_at: new Date(),
              metadata: {
                ...task.metadata,
                status: 'submitted', // Add explicit status flag
                lastStatusUpdate: new Date().toISOString()
              }
            })
            .where(eq(tasks.id, taskId));
            
          // Broadcast the corrected status
          broadcastProgressUpdate(
            taskId,
            100,
            TaskStatus.SUBMITTED,
            {
              ...task.metadata,
              submissionDate: task.metadata?.submissionDate,
              status: 'submitted'
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

    // Check if it's a KYB or Open Banking task and fetch appropriate responses
    if (taskType === 'open_banking') {
      try {
        // Fetch Open Banking responses
        console.log(`${logPrefix} Fetching Open Banking responses for task ${taskId}`);
        
        // Get the progress directly from the task metadata
        if (task.progress > 0) {
          console.log(`${logPrefix} Using task's existing progress for Open Banking task: ${task.progress}`);
          // We can exit early since the Open Banking form service handles progress
          return;
        }
        
        // Get the current progress from Open Banking service
        const openBankingFields = await db
          .select()
          .from(openBankingResponses)
          .where(eq(openBankingResponses.task_id, taskId));
        
        console.log(`${logPrefix} Found ${openBankingFields.length} Open Banking responses for task ${taskId}`);
        
        // Format the responses for progress calculation
        responses = openBankingFields.map(response => ({
          response_value: response.response_value,
          field_key: `field_${response.field_id}`,
          status: response.status,
          field_id: response.field_id,
          required: true // Assume all fields are required for now
        }));
      } catch (error) {
        console.error(`${logPrefix} Error fetching Open Banking responses:`, error);
        // Fall back to empty responses
        responses = [];
      }
    } else {
      // Default to KYB responses for backward compatibility
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
    const formattedResponses = responses.map((response) => ({
      field: response.field_key,
      status: response.response_value ? 'COMPLETE' : 'EMPTY',
      hasValue: !!response.response_value,
      required: !!response.required
    }));
    
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
        completeCount: formattedResponses.filter(r => r.status === 'COMPLETE' && r.hasValue).length
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