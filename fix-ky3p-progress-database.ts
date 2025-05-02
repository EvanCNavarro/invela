/**
 * Direct KY3P Progress Database Fix
 * 
 * This script directly updates the database for KY3P task #694 to ensure progress
 * is properly persisted. It resolves the inconsistency between the calculated progress (100%)
 * and the stored database value (0%).
 * 
 * The script works as follows:
 * 1. Verifies the current task data in the database
 * 2. Calculates the actual progress based on completed responses
 * 3. Updates the task record with a transaction to ensure atomic updates
 * 4. Verifies the update was successful
 * 5. Broadcasts the update to connected clients
 */

import { db } from '@db';
import { tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { broadcastProgressUpdate } from './server/utils/progress';
import { broadcastTaskUpdate } from './server/utils/unified-websocket';

// The task ID that needs fixing
const TARGET_TASK_ID = 694;

/**
 * Calculate KY3P progress directly from database
 */
async function calculateActualProgress(taskId: number): Promise<{
  totalFields: number;
  completedFields: number;
  progress: number;
}> {
  console.log(`[KY3P Progress Fix] Calculating actual progress for task ${taskId}`);

  // Count total KY3P fields
  const totalFieldsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ky3pFields);
  const totalFields = totalFieldsResult[0].count;

  // Count completed KY3P responses
  const completedFieldsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ky3pResponses)
    .where(
      and(
        eq(ky3pResponses.task_id, taskId),
        // Handle both capitalization variants consistently
        sql`UPPER(${ky3pResponses.status}) = 'COMPLETE'`
      )
    );
  const completedFields = completedFieldsResult[0].count;

  // Calculate progress percentage (0-100)
  const progress = totalFields > 0 ? Math.min(100, Math.round((completedFields / totalFields) * 100)) : 0;

  console.log(`[KY3P Progress Fix] Progress calculation: ${completedFields}/${totalFields} = ${progress}%`);

  return { totalFields, completedFields, progress };
}

/**
 * Update task progress and status in the database with transaction boundaries
 */
async function updateTaskProgressInDatabase(taskId: number, progress: number): Promise<boolean> {
  console.log(`[KY3P Progress Fix] Updating task ${taskId} progress to ${progress}%`);

  try {
    // Determine correct status based on progress
    const status = progress === 0 ? 'not_started' : 
                 progress < 100 ? 'in_progress' : 
                 'ready_for_submission';

    // Execute update with transaction boundaries to ensure atomicity
    const now = new Date();
    const [updatedTask] = await db.update(tasks)
      .set({
        progress,
        status,
        updated_at: now,
        metadata: sql`
          jsonb_set(
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb), 
              '{lastProgressUpdate}', to_jsonb(${now.toISOString()})
            ),
            '{progress}', to_jsonb(${progress})
          )
        `
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      console.error(`[KY3P Progress Fix] Failed to update task ${taskId} - no rows returned`);
      return false;
    }

    console.log(`[KY3P Progress Fix] Successfully updated task ${taskId}:`, {
      progress: updatedTask.progress,
      status: updatedTask.status,
      updated_at: updatedTask.updated_at
    });

    return true;
  } catch (error) {
    console.error(`[KY3P Progress Fix] Error updating task ${taskId}:`, error);
    return false;
  }
}

/**
 * Verify task update was successful
 */
async function verifyTaskUpdate(taskId: number, expectedProgress: number): Promise<boolean> {
  try {
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      console.error(`[KY3P Progress Fix] Task ${taskId} not found during verification`);
      return false;
    }

    console.log(`[KY3P Progress Fix] Verification - Task ${taskId} current state:`, {
      progress: task.progress,
      status: task.status,
      expected_progress: expectedProgress
    });

    return task.progress === expectedProgress;
  } catch (error) {
    console.error(`[KY3P Progress Fix] Error verifying task update:`, error);
    return false;
  }
}

/**
 * Broadcast task update to all connected clients
 */
async function broadcastUpdate(taskId: number, progress: number, status: string): Promise<void> {
  try {
    console.log(`[KY3P Progress Fix] Broadcasting update for task ${taskId}`);

    // Use both broadcast methods for maximum compatibility
    broadcastProgressUpdate(taskId, progress, status, {
      lastUpdated: new Date().toISOString(),
      source: 'ky3p-progress-fix',
      fixTimestamp: Date.now()
    });

    broadcastTaskUpdate(taskId, status, progress, {
      lastUpdated: new Date().toISOString(),
      source: 'ky3p-progress-fix',
      fixTimestamp: Date.now()
    });

    console.log(`[KY3P Progress Fix] Broadcast completed`);
  } catch (error) {
    console.error(`[KY3P Progress Fix] Error broadcasting update:`, error);
  }
}

/**
 * Main function to fix KY3P progress
 */
async function fixKy3pProgress(): Promise<void> {
  console.log(`[KY3P Progress Fix] Starting fix for task ${TARGET_TASK_ID}`);

  try {
    // Step 1: Get current task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));

    if (!task) {
      console.error(`[KY3P Progress Fix] Task ${TARGET_TASK_ID} not found`);
      return;
    }

    console.log(`[KY3P Progress Fix] Current task data:`, {
      id: task.id,
      type: task.task_type,
      progress: task.progress,
      status: task.status
    });

    // Step 2: Calculate actual progress
    const { progress, totalFields, completedFields } = await calculateActualProgress(TARGET_TASK_ID);
    
    console.log(`[KY3P Progress Fix] Progress discrepancy:`, {
      taskId: TARGET_TASK_ID,
      storedProgress: task.progress,
      calculatedProgress: progress,
      totalFields,
      completedFields
    });

    // Step 3: Update task in database
    const updateSuccess = await updateTaskProgressInDatabase(TARGET_TASK_ID, progress);
    
    if (!updateSuccess) {
      console.error(`[KY3P Progress Fix] Update failed for task ${TARGET_TASK_ID}`);
      return;
    }

    // Step 4: Verify the update was successful
    const verified = await verifyTaskUpdate(TARGET_TASK_ID, progress);
    
    if (!verified) {
      console.error(`[KY3P Progress Fix] Verification failed - progress not updated correctly`);
      return;
    }

    // Step 5: Broadcast the update
    const status = progress === 0 ? 'not_started' : 
                 progress < 100 ? 'in_progress' : 
                 'ready_for_submission';
                 
    await broadcastUpdate(TARGET_TASK_ID, progress, status);

    console.log(`[KY3P Progress Fix] Fix completed successfully for task ${TARGET_TASK_ID}`);
  } catch (error) {
    console.error(`[KY3P Progress Fix] Error fixing KY3P progress:`, error);
  }
}

// Run the fix
fixKy3pProgress().then(() => {
  console.log('[KY3P Progress Fix] Script execution completed');
  // Exit with success code
  process.exit(0);
}).catch(error => {
  console.error('[KY3P Progress Fix] Script execution failed:', error);
  // Exit with failure code
  process.exit(1);
});
