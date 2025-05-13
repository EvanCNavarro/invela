/**
 * Open Banking Progress Update Test
 * 
 * This script tests the task progress calculation for Open Banking forms with a
 * focus on verifying that small progress changes (0-5%) are properly saved to the database.
 */

import { updateTaskProgress, calculateUniversalTaskProgress } from './server/utils/progress.js';
import { db } from './db/index.js';
import { tasks, openBankingResponses, openBankingFields } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

// Constants
const TEST_TASK_ID = 695; // The Open Banking task with 0% progress

async function run() {
  try {
    console.log(`[Test] Testing progress calculation and updates for Open Banking task ${TEST_TASK_ID}`);
    
    // Step 1: Get current progress from the database
    const [task] = await db.select().from(tasks).where(eq(tasks.id, TEST_TASK_ID));
    
    if (!task) {
      console.error(`[Test] Task ${TEST_TASK_ID} not found`);
      return;
    }
    
    console.log(`[Test] Current progress for task ${TEST_TASK_ID}: ${task.progress}%`);
    
    // Step 2: Add a single response to trigger a small progress change
    if (task.progress === 0) {
      // Find a field to update
      const [field] = await db.select().from(openBankingFields).limit(1);
      
      if (!field) {
        console.error('[Test] No Open Banking fields found');
        return;
      }
      
      console.log(`[Test] Updating field ${field.field_key} for task ${TEST_TASK_ID}`);
      
      // Check if a response already exists
      const [existingResponse] = await db.select()
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, TEST_TASK_ID),
            eq(openBankingResponses.field_id, field.id)
          )
        );
      
      if (existingResponse) {
        // Update existing response
        await db.update(openBankingResponses)
          .set({
            response_value: 'Test Value',
            status: 'COMPLETE',
            updated_at: new Date()
          })
          .where(
            and(
              eq(openBankingResponses.task_id, TEST_TASK_ID),
              eq(openBankingResponses.field_id, field.id)
            )
          );
      } else {
        // Insert new response
        await db.insert(openBankingResponses)
          .values({
            task_id: TEST_TASK_ID,
            field_id: field.id,
            field_key: field.field_key,
            response_value: 'Test Value',
            status: 'COMPLETE'
          });
      }
      
      console.log(`[Test] Field update completed for ${field.field_key}`);
    } else {
      console.log(`[Test] Task already has progress (${task.progress}%). Skipping field update.`);
    }
    
    // Step 3: Calculate the progress directly
    const calculatedProgress = await calculateUniversalTaskProgress(TEST_TASK_ID, 'open_banking', { debug: true });
    console.log(`[Test] Calculated progress: ${calculatedProgress}%`);
    
    // Step 4: Update the task progress with our enhanced function
    console.log('[Test] Updating task progress with our enhanced function...');
    await updateTaskProgress(TEST_TASK_ID, 'open_banking', {
      debug: true,
      forceUpdate: true,
      skipBroadcast: false
    });
    
    // Step 5: Verify the updated progress
    const [updatedTask] = await db.select().from(tasks).where(eq(tasks.id, TEST_TASK_ID));
    
    console.log(`[Test] Updated progress for task ${TEST_TASK_ID}: ${updatedTask.progress}% (was ${task.progress}%)`);
    
    if (updatedTask.progress > task.progress) {
      console.log('[Test] SUCCESS: Progress was updated successfully!');
    } else if (updatedTask.progress === task.progress && updatedTask.progress > 0) {
      console.log('[Test] Progress value unchanged, but already greater than 0%');
    } else {
      console.log('[Test] FAILURE: Progress was not updated as expected.');
    }
  } catch (error) {
    console.error('[Test] Error during test:', error);
  }
}

run().catch(console.error);
