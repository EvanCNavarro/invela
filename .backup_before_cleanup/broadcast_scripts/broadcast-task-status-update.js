/**
 * Broadcast Task Status Update
 * 
 * This script broadcasts a WebSocket message to notify clients of a task status update.
 * Use this after manually updating a task's status to ensure UI is refreshed.
 */

import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Task parameters
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 758;
const taskStatus = process.argv[3] || 'submitted';
const progress = process.argv[4] ? parseInt(process.argv[4]) : 100;

// Create a unique trace ID for debugging
const traceId = `task_update_${taskId}_${Date.now()}`;

// Function to broadcast the update via WebSocket
async function broadcastTaskUpdate() {
  return new Promise((resolve, reject) => {
    try {
      // Connect to the WebSocket server
      const wsUrl = 'ws://localhost:5000/ws';
      console.log(`Connecting to WebSocket server at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      // Handle connection events
      ws.on('open', () => {
        console.log('WebSocket connection established');
        
        // Create the task update message
        const message = {
          type: 'task_update',
          payload: {
            taskId,
            id: taskId,
            status: taskStatus,
            progress,
            metadata: {
              lastUpdate: new Date().toISOString(),
              broadcastedBy: 'manual-update-script',
              traceId
            },
            timestamp: new Date().toISOString(),
            traceId
          }
        };
        
        console.log(`Broadcasting task update for task ${taskId}:`, {
          taskId,
          status: taskStatus,
          progress,
          traceId
        });
        
        // Send the message
        ws.send(JSON.stringify(message));
        
        // Close the connection after a short delay
        setTimeout(() => {
          console.log('Closing WebSocket connection');
          ws.close();
          resolve({
            success: true,
            message: `Task update for task ${taskId} broadcasted successfully`,
            traceId
          });
        }, 500);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject({
          success: false,
          error: error.message || 'Unknown WebSocket error',
          traceId
        });
      });
      
      // Set a timeout in case connection hangs
      setTimeout(() => {
        ws.close();
        reject({
          success: false,
          error: 'Connection timeout',
          traceId
        });
      }, 5000);
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      reject({
        success: false,
        error: error.message || 'Unknown error',
        traceId
      });
    }
  });
}

// Run the broadcast
console.log(`Preparing to broadcast update for task ${taskId} (status: ${taskStatus}, progress: ${progress})`);

broadcastTaskUpdate()
  .then(result => {
    console.log('Broadcast completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Broadcast failed:', error);
    process.exit(1);
  });