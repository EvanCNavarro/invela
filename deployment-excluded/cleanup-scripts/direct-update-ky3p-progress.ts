/**
 * Direct Update KY3P Progress
 * 
 * This script provides a quick and direct method to update the progress value
 * for a KY3P task with a direct database update, bypassing the complex
 * task reconciliation system to diagnose why progress isn't being persisted.
 * 
 * Usage: Run with tsx direct-update-ky3p-progress.ts
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastProgressUpdate } from './server/utils/progress';

// The target task ID with the progress issue
const TARGET_TASK_ID = 694;

/**
 * Direct update task progress in database
 */
async function directUpdateProgress() {
  console.log(`[Direct Update] Starting direct progress update for task ${TARGET_TASK_ID}`);
  
  try {
    // 1. Get current task state
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    if (!currentTask) {
      console.error(`[Direct Update] Task ${TARGET_TASK_ID} not found`);
      return;
    }
    
    console.log(`[Direct Update] Current task state:`, {
      id: currentTask.id,
      progress: currentTask.progress,
      status: currentTask.status,
      updated_at: currentTask.updated_at
    });
    
    // 2. Perform direct update with progress = 100
    const PROGRESS_VALUE = 100;
    const STATUS_VALUE = 'ready_for_submission';
    
    const updateResult = await db.update(tasks)
      .set({
        progress: PROGRESS_VALUE,
        status: STATUS_VALUE,
        updated_at: new Date()
      })
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    console.log(`[Direct Update] Database update result:`, updateResult);
    
    // 3. Verify the update
    const [updatedTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    console.log(`[Direct Update] Updated task state:`, {
      id: updatedTask.id,
      progress: updatedTask.progress,
      status: updatedTask.status,
      updated_at: updatedTask.updated_at,
      update_succeeded: updatedTask.progress === PROGRESS_VALUE
    });
    
    // 4. Broadcast update
    try {
      console.log(`[Direct Update] Broadcasting progress update...`);
      broadcastProgressUpdate(
        TARGET_TASK_ID,
        PROGRESS_VALUE,
        STATUS_VALUE,
        {
          directUpdate: true,
          timestamp: new Date().toISOString()
        }
      );
    } catch (broadcastError) {
      console.error(`[Direct Update] Broadcast error:`, broadcastError);
      // Continue even if broadcast fails
    }
    
    console.log(`[Direct Update] Progress update complete for task ${TARGET_TASK_ID}`);
  } catch (error) {
    console.error(`[Direct Update] Error updating task progress:`, error);
  }
}

// Run the direct update
directUpdateProgress().then(() => {
  console.log('[Direct Update] Script execution completed');
  process.exit(0);
}).catch(error => {
  console.error('[Direct Update] Script execution failed:', error);
  process.exit(1);
});
