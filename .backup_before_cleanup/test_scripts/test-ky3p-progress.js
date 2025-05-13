/**
 * Test script for diagnosing KY3P progress calculation issues
 *
 * This ESM module helps debug why KY3P tasks show the correct status
 * but the progress percentage remains at 0%.
 */

// Import required modules
import { db } from './server/db/index.js';
import { tasks, ky3p_responses, ky3p_fields } from './server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Test KY3P progress calculation
 */
async function testKy3pProgress() {
  // Get an existing KY3P task or create one
  const taskId = await getOrCreateKy3pTask();
  console.log(`Using KY3P task ID: ${taskId}`);
  
  // Get the total number of fields
  const totalFieldsResult = await db
    .select({ count: sql`count(*)` })
    .from(ky3p_fields);
  const totalFields = totalFieldsResult[0]?.count || 0;
  console.log(`Total KY3P fields: ${totalFields}`);
  
  // Get current completed responses
  const completedFieldsResult = await db
    .select({ count: sql`count(*)` })
    .from(ky3p_responses)
    .where(
      and(
        eq(ky3p_responses.task_id, taskId),
        sql`LOWER(${ky3p_responses.status}) = LOWER('COMPLETE')`
      )
    );
  const completedFields = completedFieldsResult[0]?.count || 0;
  console.log(`Completed responses: ${completedFields}`);
  
  // Calculate expected progress
  const rawProgress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  const expectedProgress = Math.min(100, Math.round(rawProgress));
  console.log(`Expected progress: ${expectedProgress}%`);
  
  // Get actual progress from database
  const taskResult = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  const task = taskResult[0];
  
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    return;
  }
  
  console.log(`Actual task progress: ${task.progress}%`);
  console.log(`Task status: ${task.status}`);
  
  // Add a test response if no completed responses exist
  if (completedFields === 0) {
    await addTestResponses(taskId);
    
    // After updating, calculate new expected progress
    const newCompletedFieldsResult = await db
      .select({ count: sql`count(*)` })
      .from(ky3p_responses)
      .where(
        and(
          eq(ky3p_responses.task_id, taskId),
          sql`LOWER(${ky3p_responses.status}) = LOWER('COMPLETE')`
        )
      );
    const newCompletedFields = newCompletedFieldsResult[0]?.count || 0;
    
    const newRawProgress = totalFields > 0 ? (newCompletedFields / totalFields) * 100 : 0;
    const newExpectedProgress = Math.min(100, Math.round(newRawProgress));
    
    console.log(`Updated responses - Completed: ${newCompletedFields}`);
    console.log(`Updated expected progress: ${newExpectedProgress}%`);
    
    // Force recalculate task progress
    await recalculateTaskProgress(taskId);
  }
}

/**
 * Get an existing KY3P task or create a new one
 */
async function getOrCreateKy3pTask() {
  // Find an existing KY3P task
  const existingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.task_type, 'ky3p'))
    .limit(1);
  
  if (existingTasks.length > 0) {
    return existingTasks[0].id;
  }
  
  // Create a new KY3P task if none exists
  const insertResult = await db
    .insert(tasks)
    .values({
      title: 'KY3P Test Task',
      description: 'Test task for diagnosing KY3P progress issues',
      task_type: 'ky3p',
      task_scope: 'company',
      status: 'not_started',
      progress: 0,
      company_id: 256, // Use existing test company
      created_by: 298, // Use existing test user
      priority: 'medium',
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning({ id: tasks.id });
  
  return insertResult[0].id;
}

/**
 * Add test responses to the KY3P task
 */
async function addTestResponses(taskId) {
  // Get some KY3P field IDs to use
  const fields = await db
    .select()
    .from(ky3p_fields)
    .limit(3);
  
  if (fields.length === 0) {
    console.error('No KY3P fields found');
    return;
  }
  
  console.log(`Adding test responses for ${fields.length} fields`);
  
  // Add a completed response for each field
  for (const field of fields) {
    await db
      .insert(ky3p_responses)
      .values({
        task_id: taskId,
        field_id: field.id,
        value: 'Test response',
        status: 'COMPLETE',
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflictDoUpdate({
        target: [ky3p_responses.task_id, ky3p_responses.field_id],
        set: {
          value: 'Test response',
          status: 'COMPLETE',
          updated_at: new Date()
        }
      });
  }
  
  console.log('Test responses added successfully');
}

/**
 * Force recalculation of task progress
 */
async function recalculateTaskProgress(taskId) {
  try {
    // Import dynamically to avoid ESM issues
    const { updateTaskProgress } = await import('./server/utils/task-update.js');
    console.log('Calling updateTaskProgress...');
    
    if (typeof updateTaskProgress === 'function') {
      const result = await updateTaskProgress(taskId, {
        recalculateProgress: true,
        broadcast: true
      });
      
      console.log('Progress recalculated:', result);
    } else {
      console.error('updateTaskProgress function not found in module');
    }
  } catch (error) {
    console.error('Error recalculating task progress:', error);
  }
}

// Add main function to run the test
async function main() {
  try {
    await testKy3pProgress();
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
main();
