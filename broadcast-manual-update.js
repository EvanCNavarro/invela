/**
 * Broadcast a manual task update via WebSocket to notify clients of progress changes
 * 
 * This script manually broadcasts a task update to all connected WebSocket clients
 * when we've manually updated the task progress directly in the database.
 */

import WebSocket from 'ws';
import { createPool } from './server/utils/pooled-ws-server.js';

async function broadcastTaskUpdate(taskId, progress, status, metadata) {
  try {
    console.log(`Broadcasting task update for task ${taskId}:\n  - Progress: ${progress}%\n  - Status: ${status}`);
    
    // Get the WebSocket server from the pool
    const pool = createPool();
    const wss = await pool.getServer();
    
    if (!wss) {
      console.error('No WebSocket server available in the pool');
      return { success: false, error: 'No WebSocket server available' };
    }
    
    // Prepare the update message
    const message = {
      type: 'task_update',
      // Create nested structure to match expected format on the client
      payload: {
        taskId,
        payload: {
          id: taskId,
          status,
          progress,
          metadata,
          timestamp: new Date().toISOString()
        },
        data: {
          id: taskId,
          status,
          progress,
          metadata,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      },
      // Also include at top level for older clients
      data: {
        taskId,
        payload: {
          id: taskId,
          status,
          progress,
          metadata,
          timestamp: new Date().toISOString()
        },
        data: {
          id: taskId,
          status,
          progress,
          metadata,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      },
      taskId,
      timestamp: new Date().toISOString()
    };
    
    // Count connected clients before broadcast
    let connectedClients = 0;
    let errorCount = 0;
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          connectedClients++;
        } catch (err) {
          console.error(`Error sending to client: ${err.message}`);
          errorCount++;
        }
      }
    });
    
    console.log(`Broadcast completed: ${connectedClients} clients notified (${errorCount} errors)`);
    
    return { 
      success: true, 
      connectedClients,
      errorCount,
      message: `Broadcast completed: ${connectedClients} clients notified`
    };
  } catch (error) {
    console.error(`Error broadcasting update: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function run() {
  // Task ID 739 is the KY3P task we want to update
  const taskId = 739;
  const progress = 3;
  const status = 'in_progress';
  
  // Add metadata that needs to be included in the broadcast
  const metadata = {
    locked: false,
    prerequisite_completed: true,
    prerequisite_completed_at: new Date().toISOString(),
    manualReconciliation: true,
    previousProgress: 0,
    previousStatus: 'not_started',
    lastProgressUpdate: new Date().toISOString()
  };
  
  const result = await broadcastTaskUpdate(taskId, progress, status, metadata);
  console.log(`Broadcast result: ${JSON.stringify(result, null, 2)}`);
}

// Execute the broadcast
run().catch(err => console.error(`Fatal error: ${err.message}`));
