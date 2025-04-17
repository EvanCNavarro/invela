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

    // 2. Skip reconciliation for terminal states unless forced
    const terminalStates = [TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED];
    if (!forceUpdate && terminalStates.includes(task.status as TaskStatus)) {
      if (debug) {
        console.log(`${logPrefix} Skipping task in terminal state:`, {
          taskId,
          status: task.status,
          terminalState: true
        });
      }
      return;
    }
    
    // 3. Fetch all form responses for this task
    const responses = await db.query.formResponses.findMany({
      where: eq(formResponses.task_id, taskId)
    });
    
    if (debug) {
      console.log(`${logPrefix} Found ${responses.length} responses for task ${taskId}`);
    }
    
    // 4. Build the response array in the format expected by our utilities
    const formattedResponses = responses.map((response: any) => ({
      field: response.field_key,
      status: response.value ? 'COMPLETE' : 'EMPTY',
      hasValue: !!response.value,
      required: response.required
    }));
    
    // 5. Calculate accurate progress
    const calculatedProgress = calculateKybFormProgress(formattedResponses, formattedResponses);
    
    // 6. Determine correct status
    const calculatedStatus = determineStatusFromProgress(
      calculatedProgress, 
      task.status as TaskStatus,
      formattedResponses
    );
    
    if (debug) {
      console.log(`${logPrefix} Progress calculation:`, {
        taskId,
        currentProgress: task.progress,
        calculatedProgress,
        currentStatus: task.status,
        calculatedStatus,
        responseCount: responses.length,
        completeCount: formattedResponses.filter((r: any) => r.status === 'COMPLETE' && r.hasValue).length
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
        updatedTask.metadata
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