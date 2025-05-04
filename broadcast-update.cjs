/**
 * Broadcast a manual task update via WebSocket to notify clients of progress changes
 * 
 * This script manually broadcasts a task update to all connected WebSocket clients
 * when we've manually updated the task progress directly in the database.
 */

const WebSocket = require('ws');
const path = require('path');

// Manual function to broadcast without needing the full server code
async function broadcastTaskUpdate(taskId, progress, status) {
  try {
    console.log(`Broadcasting task update for task ${taskId}:\n  - Progress: ${progress}%\n  - Status: ${status}`);
    
    // Create a WebSocket server for our broadcast
    const WS_PORT = 8080; // Any free port will do
    const wss = new WebSocket.Server({ port: WS_PORT });
    
    // Get the URL of the running server
    const REPLIT_URL = process.env.REPLIT_DB_URL?.split('=')[0].replace(/\/$/, '');
    const WS_URL = REPLIT_URL?.replace('https://', 'wss://');
    
    if (!WS_URL) {
      throw new Error('Could not determine WebSocket URL from environment');
    }
    
    console.log(`Connecting to WebSocket server at ${WS_URL}/ws`);
    
    // Connect to the running server's WebSocket
    const socket = new WebSocket(`${WS_URL}/ws`);
    
    socket.on('open', () => {
      console.log('Connected to server WebSocket');
      
      // Prepare the update message to broadcast
      const updateMessage = {
        type: 'task_update',
        payload: {
          id: taskId,
          status: status,
          progress: progress,
          metadata: {
            locked: false,
            lastUpdate: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        },
        data: {
          id: taskId,
          status: status,
          progress: progress,
          metadata: {
            locked: false,
            lastUpdate: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        },
        taskId: taskId,
        timestamp: new Date().toISOString()
      };
      
      // Send the update message
      socket.send(JSON.stringify(updateMessage));
      console.log('Update message sent successfully');
      
      // Close the connection after a short delay
      setTimeout(() => {
        socket.close();
        wss.close();
        console.log('WebSocket connections closed');
      }, 1000);
    });
    
    socket.on('message', (data) => {
      console.log('Received response:', data.toString());
    });
    
    socket.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
    
    return new Promise((resolve) => {
      socket.on('close', () => {
        console.log('Broadcast completed');
        resolve({ success: true, message: 'Broadcast completed' });
      });
    });
  } catch (error) {
    console.error(`Error broadcasting update: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function run() {
  // Task ID 739 is the KY3P task we want to update
  const taskId = 739;
  const progress = 97;
  const status = 'in_progress';
  
  try {
    const result = await broadcastTaskUpdate(taskId, progress, status);
    console.log(`Broadcast result:`, result);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
  }
}

// Execute the broadcast
run();
