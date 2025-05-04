/**
 * Test KY3P Progress Persistence Fix
 * 
 * This script tests if our fix to the transaction boundary issue in the KY3P progress
 * calculation system is working correctly. It directly exercises the updateKy3pProgressFixed
 * function and checks if progress is correctly persisted to the database.
 * 
 * Usage: Run this from Node.js with: node test-ky3p-progress-fix.js
 */

import { db } from './server/db/index.js';
import { tasks } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import { updateKy3pProgressFixed } from './server/utils/unified-progress-fixed.js';

async function testKy3pProgressFix() {
  try {
    console.log('======= KY3P Progress Persistence Test =======')
    
    // Target KY3P task ID to test with
    const TARGET_TASK_ID = 739; // Replace with your actual KY3P task ID
    
    console.log(`Testing progress fix for KY3P task ${TARGET_TASK_ID}`);
    
    // Step 1: Check current progress in database
    const [task] = await db
      .select({ id: tasks.id, progress: tasks.progress, task_type: tasks.task_type, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    if (!task) {
      console.error(`Error: Task ${TARGET_TASK_ID} not found in database`);
      return;
    }
    
    console.log(`Current task state: id=${task.id}, type=${task.task_type}, progress=${task.progress}, status=${task.status}`);
    
    // Step 2: Call the fixed update function
    console.log('\nCalling updateKy3pProgressFixed function...');
    const result = await updateKy3pProgressFixed(TARGET_TASK_ID, {
      debug: true,
      forceUpdate: true,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        testRun: 'progress-fix-verification'
      }
    });
    
    console.log('Update result:', result);
    
    // Step 3: Verify database state after update
    console.log('\nVerifying progress update in database...');
    const [updatedTask] = await db
      .select({ id: tasks.id, progress: tasks.progress, task_type: tasks.task_type, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    console.log(`Updated task state: id=${updatedTask.id}, type=${updatedTask.task_type}, progress=${updatedTask.progress}, status=${updatedTask.status}`);
    
    // Step 4: Check if the update was successful
    const successMessage = updatedTask.progress === result.progress
      ? `✅ SUCCESS: Progress persisted correctly in database (${updatedTask.progress}%)`
      : `❌ FAILURE: Progress not persisted correctly. Expected ${result.progress}%, got ${updatedTask.progress}%`;
    
    console.log('\n' + successMessage);
    console.log('\n======= Test Complete =======');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
testKy3pProgressFix();
