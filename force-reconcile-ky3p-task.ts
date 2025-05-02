/**
 * Force KY3P Task Reconciliation
 * 
 * This script forces the reconciliation of KY3P task #694, ensuring that progress is
 * properly calculated, updated in the database, and broadcast to all clients.
 * 
 * It uses our existing task reconciliation system but with forced updating
 * and additional tracing to diagnose any issues.
 */

import { reconcileTaskProgress } from './server/utils/task-reconciliation';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';

// Task ID that needs to be fixed
const TARGET_TASK_ID = 694;

/**
 * Get current task information
 */
async function getTaskInfo(taskId: number) {
  const [task] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  
  return task;
}

/**
 * Force Task Update
 */
async function forceTaskUpdate() {
  console.log(`[Force Reconcile] Starting forced reconciliation for task ${TARGET_TASK_ID}`);
  
  try {
    // Get the current task data
    const task = await getTaskInfo(TARGET_TASK_ID);
    
    if (!task) {
      console.error(`[Force Reconcile] Task ${TARGET_TASK_ID} not found`);
      return;
    }
    
    console.log(`[Force Reconcile] Current task data:`, {
      id: task.id,
      type: task.task_type,
      progress: task.progress,
      status: task.status
    });
    
    // Force the reconciliation with debug enabled
    console.log(`[Force Reconcile] Initiating forced reconciliation...`);
    await reconcileTaskProgress(TARGET_TASK_ID, { forceUpdate: true, debug: true });
    
    // Verify the update worked
    const updatedTask = await getTaskInfo(TARGET_TASK_ID);
    
    console.log(`[Force Reconcile] Task after reconciliation:`, {
      id: updatedTask.id,
      type: updatedTask.task_type,
      progress: updatedTask.progress,
      status: updatedTask.status,
      updated_at: updatedTask.updated_at
    });
    
    // Check if the update was successful
    if (updatedTask.progress === task.progress) {
      console.log(`[Force Reconcile] WARNING: Progress value did not change (${task.progress} → ${updatedTask.progress})`);
    } else {
      console.log(`[Force Reconcile] SUCCESS: Progress value updated successfully (${task.progress} → ${updatedTask.progress})`);
    }
  } catch (error) {
    console.error(`[Force Reconcile] Error during reconciliation:`, error);
  }
}

// Run the forced reconciliation
forceTaskUpdate().then(() => {
  console.log('[Force Reconcile] Script execution completed');
  process.exit(0);
}).catch(error => {
  console.error('[Force Reconcile] Script execution failed:', error);
  process.exit(1);
});
