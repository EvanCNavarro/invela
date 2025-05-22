/**
 * Test script for Universal Progress calculation
 * 
 * This script allows testing the universal progress calculation system
 * with different task types (KYB, KY3P, Open Banking) and verifies
 * the WebSocket broadcasting functionality.
 */

const { db } = require('./server/db');
const { calculateTaskProgress, broadcastProgressUpdate } = require('./server/utils/universal-progress');
const { tasks, TaskStatus } = require('./db/schema');
const { eq } = require('drizzle-orm');

/**
 * Test the universal progress calculation for a given task
 * 
 * @param {number} taskId - The ID of the task to test
 * @returns {Promise<void>}
 */
async function testUniversalProgress(taskId) {
  try {
    // First, fetch the task to get the task type
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      console.error(`Task with ID ${taskId} not found`);
      return;
    }
    
    console.log(`Testing progress calculation for task ${taskId} (${task.task_type}):\n`);
    
    // Calculate progress using our universal system
    const progress = await calculateTaskProgress(taskId, task.task_type, { debug: true });
    
    console.log(`\nCalculated progress: ${progress}%`);
    console.log(`Current task status: ${task.status}`);
    
    // Determine if we should broadcast an update
    if (progress !== task.progress) {
      console.log(`\nProgress has changed: ${task.progress}% -> ${progress}%`);
      console.log('Broadcasting update via WebSocket...');
      
      // Broadcast the update
      broadcastProgressUpdate(
        taskId,
        progress,
        task.status,
        task.metadata || {}
      );
      
      console.log('Update broadcast completed.');
    } else {
      console.log('\nProgress has not changed. No broadcast needed.');
    }
    
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Error testing universal progress:', error);
  }
}

/**
 * Main function to run the test
 */
async function main() {
  // Check if task ID was provided as command line argument
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.error('Please provide a task ID as a command line argument');
    console.error('Usage: node test-universal-progress.js <taskId>');
    process.exit(1);
  }
  
  await testUniversalProgress(parseInt(taskId));
  
  // Exit when complete
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
