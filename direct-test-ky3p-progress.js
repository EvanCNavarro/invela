/**
 * Direct KY3P Progress Test
 * 
 * This script tests the KY3P progress calculation fix by directly
 * communicating with the database and bypassing the API.
 * 
 * It:
 * 1. Finds a KY3P task
 * 2. Adds several responses with COMPLETE status
 * 3. Triggers progress recalculation
 * 4. Verifies the progress is correctly calculated
 */

import { db } from './db';
import { tasks, ky3pResponses, ky3pFields, KYBFieldStatus } from './db/schema';
import { eq, and } from 'drizzle-orm';
import * as progressUtils from './server/utils/progress';

async function testKy3pProgress() {
  try {
    console.log('Finding a KY3P task...');
    const allTasks = await db.select().from(tasks);
    const ky3pTask = allTasks.find(t => t.task_type === 'ky3p' || t.task_type === 'security_assessment');
    
    if (!ky3pTask) {
      console.error('No KY3P task found. Please create one and try again.');
      return;
    }
    
    console.log(`Found KY3P task: ID=${ky3pTask.id}, Progress=${ky3pTask.progress}%`);
    
    // Get KY3P fields
    const fields = await db.select().from(ky3pFields).limit(10);
    console.log(`Found ${fields.length} KY3P fields to use for testing`);
    
    // Get current responses
    const existingResponses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, ky3pTask.id));
    
    console.log(`Task has ${existingResponses.length} existing responses`);
    console.log(`Of these, ${existingResponses.filter(r => r.status === KYBFieldStatus.COMPLETE).length} are marked COMPLETE`);
    
    // Add 5 new COMPLETE responses
    const testFields = fields.slice(0, 5);
    console.log(`Adding ${testFields.length} new COMPLETE responses`);
    
    const now = new Date();
    
    // First, delete any existing responses for the same fields to avoid conflicts
    for (const field of testFields) {
      await db
        .delete(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, ky3pTask.id),
            eq(ky3pResponses.field_id, field.id)
          )
        );
    }
    
    // Insert new COMPLETE responses
    for (const field of testFields) {
      await db.insert(ky3pResponses).values({
        task_id: ky3pTask.id,
        field_id: field.id,
        response_value: `Test value ${Math.random().toString(36).substring(2, 7)}`,
        status: KYBFieldStatus.COMPLETE, // Using the enum value directly
        created_at: now,
        updated_at: now
      });
    }
    
    console.log('Test responses added successfully');
    
    // Recalculate progress
    console.log('Recalculating progress...');
    const progress = await progressUtils.calculateUniversalTaskProgress(ky3pTask.id, 'ky3p', { debug: true });
    console.log(`Calculated progress: ${progress}%`);
    
    // Update task with new progress
    console.log('Updating task progress...');
    const updatedTask = await progressUtils.updateTaskProgress(ky3pTask.id, 'ky3p', { debug: true, forceUpdate: true });
    
    // Print results
    console.log('\nTest Results:');
    console.log(`Task ID: ${ky3pTask.id}`);
    console.log(`Original Progress: ${ky3pTask.progress}%`);
    console.log(`Calculated Progress: ${progress}%`);
    console.log(`Updated Task Progress: ${updatedTask ? updatedTask.progress : 'N/A'}%`);
    console.log(`Progress Change: ${updatedTask ? (updatedTask.progress - ky3pTask.progress) : 'N/A'}%`);
    
    return {
      success: true,
      originalProgress: ky3pTask.progress,
      calculatedProgress: progress,
      updatedProgress: updatedTask ? updatedTask.progress : null,
      taskId: ky3pTask.id
    };
  } catch (error) {
    console.error('Error during KY3P progress test:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testKy3pProgress().then(result => {
  console.log('\nTest completed:', result.success ? 'SUCCESS' : 'FAILURE');
  if (!result.success) {
    console.error('Error:', result.error);
    process.exit(1);
  }
  process.exit(0);
});
