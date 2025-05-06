/**
 * Test script for task_update event broadcast
 * 
 * This script simulates a task update and broadcasts it via WebSocket
 * to test our improved FormSubmissionListener.
 */

const WebSocket = require('ws');

// Import the database connection
const { db } = require('./db');
const { tasks } = require('./db/schema');
const { eq } = require('drizzle-orm');

// Import the broadcast function
const { broadcastTaskUpdate } = require('./server/utils/unified-websocket');

/**
 * Get an existing task for testing
 */
async function getTestTask() {
  try {
    // Get a random task from the database (preferably a form task)
    const foundTasks = await db.query.tasks.findMany({
      limit: 1,
      where: (tasks) => eq(tasks.type, 'kyb')
    });
    
    if (foundTasks.length === 0) {
      console.log('No tasks found for testing. Creating a test task instead.');
      // Create a test task if none exists
      const [newTask] = await db.insert(tasks).values({
        title: 'Test Task for WebSocket',
        description: 'A test task to verify WebSocket broadcasting',
        status: 'in_progress',
        type: 'kyb',
        progress: 50,
        user_id: 315,
        company_id: 272
      }).returning();
      
      return newTask;
    }
    
    return foundTasks[0];
  } catch (error) {
    console.error('Error getting test task:', error);
    throw error;
  }
}

/**
 * Broadcast a task update message
 */
async function testTaskUpdateBroadcast() {
  try {
    console.log('Getting a test task...');
    const task = await getTestTask();
    console.log(`Found task ${task.id} (${task.title}) with status ${task.status}`);
    
    // Simulate task status change to 'submitted'
    console.log('Simulating task submission...');
    const newStatus = 'submitted';
    
    // Update task in database
    await db.update(tasks)
      .set({ 
        status: newStatus, 
        progress: 100
      })
      .where(eq(tasks.id, task.id));
      
    console.log(`Updated task status to ${newStatus} and progress to 100%`);
    
    // Broadcast the task update
    console.log('Broadcasting task status update via WebSocket...');
    const result = await broadcastTaskUpdate(
      task.id,
      100,
      newStatus,
      {
        formType: task.type,
        message: 'Task was submitted successfully',
        submissionDate: new Date().toISOString()
      }
    );
    
    console.log('Broadcast result:', result);
    console.log('Testing complete!');
    
    return {
      success: true,
      taskId: task.id,
      status: newStatus
    };
  } catch (error) {
    console.error('Error testing task update broadcast:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testTaskUpdateBroadcast()
  .then(result => {
    console.log('Test completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });