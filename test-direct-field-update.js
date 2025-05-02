/**
 * Direct Test Script for Field Updates
 * 
 * This script directly tests updating a single field and verifying
 * if the progress calculation and database updates work correctly.
 */

const axios = require('axios');
const { db } = require('./server/db');
const { tasks } = require('./db/schema');
const { eq } = require('drizzle-orm');

/**
 * Get the current task progress from the database
 * @param {number} taskId - Task ID to check 
 */
async function getTaskProgress(taskId) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return {
    progress: task.progress,
    status: task.status,
    taskType: task.task_type
  };
}

/**
 * Update a single field for an Open Banking task
 * @param {number} taskId - Task ID
 * @param {string} fieldKey - Field key to update
 * @param {any} value - Value to set for the field
 */
async function updateOpenBankingField(taskId, fieldKey, value) {
  console.log(`Updating field ${fieldKey} for task ${taskId} with value:`, value);
  
  try {
    // Make a direct request to the API endpoint
    const response = await axios.post(
      `http://localhost:5000/api/open-banking/${taskId}/fields/${fieldKey}`,
      { value }
    );
    
    console.log('Update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating field:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main function to test field updates
 */
async function main() {
  // Get task ID and field key from command line arguments
  const taskId = process.argv[2];
  const fieldKey = process.argv[3];
  const value = process.argv[4] || 'Test value from direct update script';
  
  if (!taskId || !fieldKey) {
    console.error('Please provide a task ID and field key as command line arguments');
    console.error('Usage: node test-direct-field-update.js <taskId> <fieldKey> [value]');
    process.exit(1);
  }
  
  try {
    // Get the initial task progress
    console.log('\n=== BEFORE UPDATE ===');
    const beforeUpdate = await getTaskProgress(parseInt(taskId));
    console.log(`Task ${taskId} initial progress: ${beforeUpdate.progress}%`);
    console.log(`Task ${taskId} initial status: ${beforeUpdate.status}`);
    
    // Update the field
    console.log('\n=== UPDATING FIELD ===');
    await updateOpenBankingField(parseInt(taskId), fieldKey, value);
    
    // Get the updated task progress
    console.log('\n=== AFTER UPDATE ===');
    const afterUpdate = await getTaskProgress(parseInt(taskId));
    console.log(`Task ${taskId} updated progress: ${afterUpdate.progress}%`);
    console.log(`Task ${taskId} updated status: ${afterUpdate.status}`);
    
    // Report if progress changed
    if (beforeUpdate.progress !== afterUpdate.progress) {
      console.log(`\n✅ SUCCESS: Progress updated from ${beforeUpdate.progress}% to ${afterUpdate.progress}%`);
    } else {
      console.log(`\n❌ ERROR: Progress did not change (${beforeUpdate.progress}% -> ${afterUpdate.progress}%)`);
    }
    
    // Report if status changed
    if (beforeUpdate.status !== afterUpdate.status) {
      console.log(`✅ SUCCESS: Status updated from ${beforeUpdate.status} to ${afterUpdate.status}`);
    } else {
      console.log(`ℹ️ INFO: Status remained ${beforeUpdate.status}`);
    }
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
