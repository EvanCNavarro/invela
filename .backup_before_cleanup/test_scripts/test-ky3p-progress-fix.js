/**
 * Test KY3P Progress Fix
 * 
 * This script tests the fixed KY3P progress calculation by:
 * 1. Finding a KY3P task
 * 2. Adding responses to the task
 * 3. Triggering task reconciliation
 * 4. Verifying the progress is calculated correctly
 */

import * as dotenv from 'dotenv';
import pg from 'pg';
import { performance } from 'perf_hooks';

dotenv.config();
const { Client } = pg;

// Set up database client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function findKy3pTask() {
  const query = `
    SELECT id, progress, status, task_type, metadata 
    FROM tasks 
    WHERE task_type = 'ky3p' AND status = 'not_started'
    ORDER BY id DESC
    LIMIT 1
  `;
  
  const result = await client.query(query);
  if (result.rows.length === 0) {
    log('No KY3P task found', colors.red);
    return null;
  }
  
  return result.rows[0];
}

async function addKy3pResponses(taskId, count = 5) {
  // First, get some KY3P field IDs to use
  const fieldsQuery = `
    SELECT id, field_key FROM ky3p_fields LIMIT ${count}
  `;
  
  const fieldsResult = await client.query(fieldsQuery);
  if (fieldsResult.rows.length === 0) {
    log('No KY3P fields found', colors.red);
    return false;
  }
  
  // Delete any existing responses for this task
  await client.query('DELETE FROM ky3p_responses WHERE task_id = $1', [taskId]);
  
  // Add responses for each field
  let addedCount = 0;
  const completedCount = Math.ceil(fieldsResult.rows.length * 0.6); // Make 60% complete
  
  for (let i = 0; i < fieldsResult.rows.length; i++) {
    const field = fieldsResult.rows[i];
    const status = i < completedCount ? 'COMPLETE' : 'INCOMPLETE';
    const responseValue = i < completedCount ? 'Test response ' + i : null;
    
    const insertQuery = `
      INSERT INTO ky3p_responses (task_id, field_id, field_key, response_value, status)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await client.query(insertQuery, [
      taskId, 
      field.id,
      field.field_key,
      responseValue,
      status
    ]);
    
    addedCount++;
  }
  
  log(`Added ${addedCount} responses (${completedCount} complete) for task ${taskId}`, colors.green);
  return true;
}

async function triggerTaskReconciliation(taskId) {
  // Import using dynamic import for ES modules
  const taskReconciliation = await import('./server/utils/task-reconciliation.js');
  const { calculateTaskProgressFromDB, reconcileTaskProgress } = taskReconciliation;
  
  // Calculate the progress directly
  const progress = await calculateTaskProgressFromDB(taskId, 'ky3p');
  log(`Direct progress calculation: ${progress}%`, colors.cyan);
  
  // Trigger reconciliation
  log(`Triggering task reconciliation for task ${taskId}...`, colors.yellow);
  await reconcileTaskProgress(taskId, { forceUpdate: true, debug: true });
  
  return progress;
}

async function verifyProgress(taskId, expectedProgress) {
  // Check the task's progress in the database
  const query = `
    SELECT progress, status FROM tasks WHERE id = $1
  `;
  
  const result = await client.query(query, [taskId]);
  const task = result.rows[0];
  
  log(`Task ${taskId} progress after reconciliation: ${task.progress}%`, colors.cyan);
  log(`Task ${taskId} status after reconciliation: ${task.status}`, colors.cyan);
  
  if (task.progress === expectedProgress) {
    log(`✅ Success! Progress matches expected value (${expectedProgress}%)`, colors.green);
    return true;
  } else {
    log(`❌ Failed! Progress (${task.progress}%) doesn't match expected value (${expectedProgress}%)`, colors.red);
    return false;
  }
}

async function countKy3pFieldsAndResponses(taskId) {
  // Count total fields in the database
  const totalFieldsQuery = `SELECT COUNT(*) AS count FROM ky3p_fields`;
  const totalFields = (await client.query(totalFieldsQuery)).rows[0].count;
  
  // Count distinct fields with responses for this task
  const fieldWithResponsesQuery = `
    SELECT COUNT(DISTINCT field_id) AS count 
    FROM ky3p_responses 
    WHERE task_id = $1
  `;
  const fieldsWithResponses = (await client.query(fieldWithResponsesQuery, [taskId])).rows[0].count;
  
  // Count completed responses
  const completedResponsesQuery = `
    SELECT COUNT(*) AS count 
    FROM ky3p_responses 
    WHERE task_id = $1 AND UPPER(status) = 'COMPLETE'
  `;
  const completedResponses = (await client.query(completedResponsesQuery, [taskId])).rows[0].count;
  
  log(`KY3P Fields statistics:`, colors.yellow);
  log(`- Total fields in database: ${totalFields}`, colors.cyan);
  log(`- Fields with responses for task ${taskId}: ${fieldsWithResponses}`, colors.cyan);
  log(`- Completed responses for task ${taskId}: ${completedResponses}`, colors.cyan);
  
  // Calculate what the progress SHOULD be
  const calculatedProgress = Math.round((completedResponses / fieldsWithResponses) * 100);
  log(`- Expected progress calculation: ${completedResponses}/${fieldsWithResponses} = ${calculatedProgress}%`, colors.green);
  
  return {
    totalFields,
    fieldsWithResponses,
    completedResponses, 
    calculatedProgress
  };
}

async function runTest() {
  try {
    // Connect to database
    await client.connect();
    log('Connected to database', colors.green);
    
    // Find a KY3P task
    const task = await findKy3pTask();
    if (!task) {
      return;
    }
    
    log(`Found KY3P task ${task.id} with progress ${task.progress}%`, colors.green);
    
    // Add responses
    const added = await addKy3pResponses(task.id, 10);
    if (!added) {
      return;
    }
    
    // Count fields and responses to know what to expect
    const stats = await countKy3pFieldsAndResponses(task.id);
    
    // Trigger reconciliation
    const calculatedProgress = await triggerTaskReconciliation(task.id);
    
    // Verify the progress
    await verifyProgress(task.id, stats.calculatedProgress);
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Close the database connection
    await client.end();
    log('Test completed', colors.green);
  }
}

// Run the test
runTest();
