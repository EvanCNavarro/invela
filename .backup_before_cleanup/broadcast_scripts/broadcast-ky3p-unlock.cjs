/**
 * Broadcast KY3P task unlock via WebSocket
 * 
 * This script sends a WebSocket message to notify clients that
 * the KY3P task is now unlocked and available
 */

const WebSocket = require('ws');

// Constants
const TASK_ID = 617;  // ID of the KY3P task
const WS_SERVER_PORT = 5000;
const WS_PATH = '/ws';

async function run() {
  return new Promise((resolve, reject) => {
    try {
      console.log('[WebSocket] Connecting to server...');
      
      // Create WebSocket client
      const ws = new WebSocket(`ws://localhost:${WS_SERVER_PORT}${WS_PATH}`);
      
      ws.on('open', () => {
        console.log('[WebSocket] Connection established');
        
        // Create the task update message
        const message = {
          type: 'task_updated',
          id: TASK_ID,
          status: 'not_started',
          progress: 0,
          metadata: {
            locked: false,
            prerequisite_completed: true,
            prerequisite_completed_at: new Date().toISOString(),
            forceRefresh: true
          },
          timestamp: new Date().toISOString()
        };
        
        console.log('[WebSocket] Sending KY3P task unlock message:', message);
        
        // Send the update
        ws.send(JSON.stringify(message));
        
        // Wait a moment to ensure message is processed
        setTimeout(() => {
          console.log('[WebSocket] Message sent, closing connection...');
          ws.close();
          resolve(true);
        }, 500);
      });
      
      ws.on('message', (data) => {
        console.log('[WebSocket] Received response:', data.toString());
      });
      
      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
        reject(error);
      });
      
      ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
      });
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      reject(error);
    }
  });
}

// Execute the script
(async () => {
  try {
    console.log('Broadcasting task update for KY3P task (ID: ' + TASK_ID + ')');
    await run();
    console.log('Broadcast complete!');
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
})();