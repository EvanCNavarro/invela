/**
 * Test WebSocket Broadcast for Fields Cleared Event
 * 
 * This script tests sending a fields_cleared event over WebSocket
 * to test the FormFieldsListener component functionality.
 */

const WebSocket = require('ws');
// Import the websocket-broadcast module for direct WebSocket testing
const WebSocketModule = require('./server/utils/websocket-broadcast');
const { broadcastMessage } = WebSocketModule;

// Log a message to the console
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Test broadcasting a fields_cleared event
async function testFieldsCleared() {
  try {
    // Broadcast a test fields_cleared event
    const taskId = 654; // The task ID to clear fields for
    const formType = 'ky3p'; // The form type (e.g., 'ky3p', 'kyb', 'open_banking')
    
    log(`Broadcasting fields_cleared event for task ${taskId} (${formType})`);
    
    // Create the message payload
    const result = broadcastMessage('form_fields', {
      taskId,
      formType,
      action: 'fields_cleared',
      timestamp: new Date().toISOString(),
      metadata: {
        preserveProgress: false,
        source: 'test-script'
      }
    });
    
    // Log the result
    log(`Broadcast result: ${JSON.stringify(result)}`);
    
    // Success message
    if (result && result.success) {
      log(`Successfully broadcast fields_cleared event to ${result.clientCount} clients`);
    } else {
      log('Failed to broadcast event');
    }
  } catch (error) {
    console.error('Error testing fields cleared event:', error);
  }
}

// Run the test
testFieldsCleared();