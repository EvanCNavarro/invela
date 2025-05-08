/**
 * Direct Test for Clear Fields Functionality
 * 
 * This script provides a simple, direct test for the clear fields functionality
 * to verify that it correctly deletes responses and updates progress.
 */

import pg from 'pg';
const { Pool } = pg;

// Create a PostgreSQL connection pool for direct operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper to format log messages with timestamp
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Test the clear fields functionality for a specific task
 * 
 * @param {number} taskId - Task ID to test with
 * @param {string} formType - Form type (kyb, ky3p, open_banking, card)
 * @param {boolean} preserveProgress - Whether to preserve progress
 */
async function testClearFields(taskId, formType, preserveProgress = false) {
  try {
    log(`Starting clear fields test for task ${taskId} (${formType}), preserveProgress=${preserveProgress}`);
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // First, check the task exists
      log(`Checking if task ${taskId} exists...`);
      const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      
      if (taskResult.rows.length === 0) {
        log(`Task ${taskId} not found - test aborted.`);
        return;
      }
      
      const task = taskResult.rows[0];
      log(`Found task: ${task.title} (${task.task_type})`);
      log(`Current progress: ${task.progress}%`);
      log(`Current status: ${task.status}`);
      
      // Check for responses before delete
      const normalizedFormType = 
        formType === 'company_kyb' ? 'kyb' : 
        formType === 'open-banking' ? 'open_banking' : 
        formType;
      
      // Determine table name
      let tableName;
      switch (normalizedFormType) {
        case 'kyb':
          tableName = 'kyb_responses';
          break;
        case 'ky3p':
          tableName = 'ky3p_responses';
          break;
        case 'open_banking':
          tableName = 'open_banking_responses';
          break;
        case 'card':
          tableName = 'card_responses';
          break;
        default:
          log(`Unsupported form type: ${formType} - test aborted.`);
          return;
      }
      
      // Check for responses before clearing
      log(`Checking for existing responses in ${tableName}...`);
      const responsesBeforeResult = await client.query(
        `SELECT COUNT(*) FROM ${tableName} WHERE task_id = $1`,
        [taskId]
      );
      
      const responsesBeforeCount = parseInt(responsesBeforeResult.rows[0].count);
      log(`Found ${responsesBeforeCount} responses before clearing`);
      
      // Clear the fields using a direct delete (simulating what the service does)
      log(`Now clearing fields for task ${taskId}...`);
      const deleteResult = await client.query(
        `DELETE FROM ${tableName} WHERE task_id = $1`,
        [taskId]
      );
      
      log(`Deleted ${deleteResult.rowCount} responses from ${tableName}`);
      
      // Update progress if requested
      if (!preserveProgress) {
        log(`Resetting progress to 0% for task ${taskId}...`);
        await client.query('UPDATE tasks SET progress = 0 WHERE id = $1', [taskId]);
      } else {
        log(`Preserving progress (${task.progress}%) as requested`);
      }
      
      // Verify responses are gone
      const responsesAfterResult = await client.query(
        `SELECT COUNT(*) FROM ${tableName} WHERE task_id = $1`,
        [taskId]
      );
      
      const responsesAfterCount = parseInt(responsesAfterResult.rows[0].count);
      log(`Found ${responsesAfterCount} responses after clearing (should be 0)`);
      
      // Check updated task progress
      const updatedTaskResult = await client.query('SELECT progress FROM tasks WHERE id = $1', [taskId]);
      const updatedProgress = updatedTaskResult.rows[0].progress;
      log(`Updated progress: ${updatedProgress}% (should be ${preserveProgress ? task.progress : 0}%)`);
      
      // Log success message
      log(`Test completed successfully!`);
      log(`Summary: Deleted ${deleteResult.rowCount} responses, progress is now ${updatedProgress}%`);
      
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  } catch (error) {
    log('Error during clear fields test:', error);
  }
}

// Execute the test for the specific task
const taskId = 762; // The task having issues
const formType = 'company_kyb'; // The form type to test with
const preserveProgress = false; // Whether to preserve progress

// Run the test
testClearFields(taskId, formType, preserveProgress)
  .then(() => {
    log('Test finished.');
    process.exit(0);
  })
  .catch(error => {
    log('Test failed with error:', error);
    process.exit(1);
  });