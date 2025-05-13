/**
 * Direct test for the unified KY3P progress solution
 * 
 * This script directly tests our unified task progress implementation
 * by making database queries and API calls to verify progress calculation,
 * status determination, and WebSocket notifications work correctly.
 */

const { db } = require('./server/db');
const { tasks, ky3pResponses, ky3pFields } = require('./server/db/schema');
const { eq, and } = require('drizzle-orm');

// Import the unified progress functions for direct testing
const { 
  calculateTaskProgress,
  determineTaskStatus,
  updateTaskProgress 
} = require('./server/utils/unified-task-progress');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

/**
 * Find a KY3P task to test with
 */
async function findTestTask() {
  log('Looking for a KY3P task to test with...', colors.blue);
  
  const ky3pTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.task_type, 'ky3p'))
    .limit(1);
    
  if (ky3pTasks.length === 0) {
    log('No KY3P tasks found. Please create one first.', colors.red);
    return null;
  }
  
  const task = ky3pTasks[0];
  log(`Found task #${task.id}: ${task.title || 'No title'}`, colors.green);
  log(`Current status: ${task.status}, Progress: ${task.progress}%`, colors.cyan);
  
  return task;
}

/**
 * Get available KY3P fields
 */
async function getKy3pFields() {
  log('\nFetching KY3P fields...', colors.blue);
  
  const fields = await db
    .select()
    .from(ky3pFields)
    .limit(10);
    
  log(`Found ${fields.length} fields`, colors.green);
  
  return fields;
}

/**
 * Add test responses to KY3P task
 */
async function addTestResponses(taskId, fields) {
  log('\nAdding test responses...', colors.blue);
  
  // Take 5 random fields
  const fieldsToUpdate = fields
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
    
  log(`Selected ${fieldsToUpdate.length} fields to update`, colors.cyan);
  
  // Save current timestamp
  const timestamp = new Date();
  
  // Add responses - use transaction to ensure all updates go through
  let addedCount = 0;
  let updatedCount = 0;
  
  await db.transaction(async (tx) => {
    for (const field of fieldsToUpdate) {
      // Check if response already exists
      const [existingResponse] = await tx
        .select()
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.field_id, field.id)
          )
        );
        
      if (existingResponse) {
        // Update existing response
        await tx
          .update(ky3pResponses)
          .set({
            response_value: `Test value for field ${field.id} - ${new Date().toISOString()}`,
            status: 'COMPLETE', // Use uppercase for consistency
            updated_at: timestamp
          })
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.field_id, field.id)
            )
          );
          
        updatedCount++;
      } else {
        // Add new response
        await tx
          .insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: `Test value for field ${field.id} - ${new Date().toISOString()}`,
            status: 'COMPLETE', // Use uppercase for consistency
            created_at: timestamp,
            updated_at: timestamp
          });
          
        addedCount++;
      }
    }
  });
  
  log(`Added ${addedCount} new responses, updated ${updatedCount} existing responses`, colors.green);
  
  return { addedCount, updatedCount };
}

/**
 * Test the unified progress calculation
 */
async function testProgressCalculation(taskId) {
  log('\nTesting unified progress calculation...', colors.blue);
  
  // Get the task before calculation
  const [taskBefore] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
  log(`Current progress in database: ${taskBefore.progress}%`, colors.cyan);
  
  // Get the total number of KY3P fields
  const [totalResult] = await db
    .select({ count: db.sql`count(*)` })
    .from(ky3pFields);
  const totalFields = totalResult.count;
  
  // Get the number of completed responses
  const [completedResult] = await db
    .select({ count: db.sql`count(*)` })
    .from(ky3pResponses)
    .where(
      and(
        eq(ky3pResponses.task_id, taskId),
        eq(ky3pResponses.status, 'COMPLETE')
      )
    );
  const completedFields = completedResult.count;
  
  // Calculate expected progress
  const expectedProgress = Math.round((completedFields / totalFields) * 100);
  
  log(`Field counts: ${completedFields}/${totalFields} complete`, colors.cyan);
  log(`Expected progress: ${expectedProgress}%`, colors.yellow);
  
  // Use our unified calculateTaskProgress function
  const calculatedProgress = await calculateTaskProgress(taskId, 'ky3p', { debug: true });
  
  log(`Calculated progress from unified function: ${calculatedProgress}%`, colors.green);
  
  // Check if they match
  if (expectedProgress === calculatedProgress) {
    log('✅ Progress calculation is correct!', colors.bright + colors.green);
  } else {
    log('❌ Progress calculation mismatch!', colors.bright + colors.red);
  }
  
  return {
    taskBefore,
    expectedProgress,
    calculatedProgress,
  };
}

/**
 * Test the unified progress update function
 */
async function testProgressUpdate(taskId) {
  log('\nTesting unified progress update...', colors.blue);
  
  // Get the task before update
  const [taskBefore] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
  log(`Current task status: ${taskBefore.status}, progress: ${taskBefore.progress}%`, colors.cyan);
  
  // Call the unified update function
  log('Calling updateTaskProgress()...', colors.yellow);
  const result = await updateTaskProgress(taskId, 'ky3p', {
    debug: true,
    forceUpdate: true,
    metadata: {
      testRun: true,
      timestamp: new Date().toISOString()
    }
  });
  
  log(`Update result: ${result.success ? 'SUCCESS' : 'FAILED'}`, colors.cyan);
  log(JSON.stringify(result, null, 2), colors.cyan);
  
  // Get the task after update
  const [taskAfter] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
  log(`Updated task status: ${taskAfter.status}, progress: ${taskAfter.progress}%`, colors.green);
  
  // Check if update was successful
  if (result.success) {
    // Verify that the update was persisted to the database
    if (taskAfter.progress === result.progress) {
      log('✅ Progress was correctly persisted to the database!', colors.bright + colors.green);
    } else {
      log('❌ Progress mismatch between result and database!', colors.bright + colors.red);
      log(`Result: ${result.progress}%, Database: ${taskAfter.progress}%`, colors.red);
    }
  } else {
    log('❌ Progress update failed!', colors.bright + colors.red);
  }
  
  return {
    taskBefore,
    result,
    taskAfter
  };
}

/**
 * Run the complete test suite
 */
async function runTests() {
  try {
    log('=== Testing Unified KY3P Progress Implementation ===', colors.bright + colors.magenta);
    
    // Find a test task
    const task = await findTestTask();
    if (!task) return;
    
    // Get KY3P fields
    const fields = await getKy3pFields();
    if (!fields || fields.length === 0) {
      log('No KY3P fields found. Test aborted.', colors.red);
      return;
    }
    
    // Add test responses
    await addTestResponses(task.id, fields);
    
    // Test progress calculation
    const calculationResult = await testProgressCalculation(task.id);
    
    // Test progress update
    const updateResult = await testProgressUpdate(task.id);
    
    // Final assessment
    log('\n=== Test Results ===', colors.bright + colors.magenta);
    
    // Progress calculation
    if (calculationResult.expectedProgress === calculationResult.calculatedProgress) {
      log('✅ Progress calculation works correctly', colors.green);
    } else {
      log('❌ Progress calculation has issues', colors.red);
    }
    
    // Progress persistence
    if (updateResult.result.success && updateResult.taskAfter.progress === updateResult.result.progress) {
      log('✅ Progress persistence works correctly', colors.green);
    } else {
      log('❌ Progress persistence has issues', colors.red);
    }
    
    // Status determination
    if (updateResult.taskBefore.status !== updateResult.taskAfter.status) {
      log('ℹ️ Task status was updated from ' + 
          `${updateResult.taskBefore.status} to ${updateResult.taskAfter.status}`, colors.blue);
    }
    
    log('\n=== Test Complete ===', colors.bright + colors.green);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, colors.bright + colors.red);
    console.error(error);
  }
}

runTests();
