// Direct WebSocket testing script (CommonJS format)

/**
 * This script directly broadcasts a task update WebSocket message
 * without needing to go through the API
 * 
 * This is used to test our WebSocket fix in FormSubmissionListener
 */

// Import unified WebSocket module using CommonJS
const { broadcastTaskUpdate } = require('./server/utils/unified-websocket');

// Simulate a task update broadcast
async function testBroadcast() {
  try {
    console.log('Broadcasting test task update message...');
    
    // Send a test message
    const result = await broadcastTaskUpdate(
      789, // Fake task ID - just for testing the WebSocket handling
      100, // 100% progress
      'submitted', // Status
      {
        formType: 'kyb', // The form type
        message: 'Task was submitted successfully',
        submissionDate: new Date().toISOString()
      }
    );
    
    console.log('Broadcast result:', result);
    console.log('Check your browser console for WebSocket messages!');
    
    return { success: true };
  } catch (error) {
    console.error('Error broadcasting test message:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testBroadcast()
  .then(result => console.log('Test completed:', result))
  .catch(error => console.error('Test failed:', error));