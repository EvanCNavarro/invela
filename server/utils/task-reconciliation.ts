import { eq, and } from 'drizzle-orm';
import { db } from "@db";
import { tasks, kybResponses, kybFields } from "@db/schema";
import { TaskStatus } from '../types';
import { calculateKybFormProgress } from './kyb-progress';
import { determineStatusFromProgress, broadcastProgressUpdate } from './progress';

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
        
        // Force task to submitted status with 100% progress
        await db.update(tasks)
          .set({
            status: TaskStatus.SUBMITTED,
            progress: 100,
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
          
        // Broadcast the corrected status
        broadcastProgressUpdate(
          taskId,
          100,
          TaskStatus.SUBMITTED,
          task.metadata || {}
        );
      }
      
      return;
    }
    
    // 3. Fetch all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status,
      field_id: kybResponses.field_id,
      required: kybFields.required
    })
    .from(kybResponses)
    .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
    .where(eq(kybResponses.task_id, taskId));
    
    if (debug) {
      console.log(`${logPrefix} Found ${responses.length} responses for task ${taskId}`);
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