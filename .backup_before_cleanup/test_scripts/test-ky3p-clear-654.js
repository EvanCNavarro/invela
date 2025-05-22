/**
 * Test script for KY3P clear functionality for task 654
 * This script uses fetch to call the clear endpoint directly
 */

// Define the endpoint URL and task ID
const TASK_ID = 654; 
const API_URL = `http://localhost:5000/api/ky3p/clear/${TASK_ID}`;

// Check task status before clearing
async function checkTaskStatus() {
  try {
    const response = await fetch(`http://localhost:5000/api/tasks.json/${TASK_ID}`);
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status} ${response.statusText}`);
    }
    const task = await response.json();
    console.log('Current task status:', {
      id: task.id,
      status: task.status,
      progress: task.progress
    });
    return task;
  } catch (error) {
    console.error('Error checking task status:', error);
    throw error;
  }
}

// Call the clear endpoint
async function clearKy3pTask() {
  try {
    // First check current status
    console.log('Checking current task status...');
    const beforeTask = await checkTaskStatus();
    
    console.log(`Calling KY3P clear endpoint for task ${TASK_ID}...`);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Clear request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Clear endpoint response:', result);
    
    // Check status after clearing
    console.log('Checking task status after clearing...');
    const afterTask = await checkTaskStatus();
    
    // Verify the changes
    console.log('Verification results:');
    console.log('- Status before:', beforeTask.status);
    console.log('- Status after:', afterTask.status);
    console.log('- Progress before:', beforeTask.progress);
    console.log('- Progress after:', afterTask.progress);
    console.log('- Status changed correctly:', beforeTask.status !== afterTask.status);
    console.log('- Progress reset correctly:', afterTask.progress === 0);
    
    if (afterTask.status === 'not_started' && afterTask.progress === 0) {
      console.log('✅ TEST PASSED: Task was cleared successfully');
    } else {
      console.log('❌ TEST FAILED: Task was not properly cleared');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Automatically run the test
clearKy3pTask();