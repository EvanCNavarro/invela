/**
 * Direct fix to unlock Open Banking task ID 614
 * 
 * This script uses direct database access to unlock the Open Banking
 * task and remove its lock status in both the database and through
 * WebSocket notification
 */

import { db } from './db/index.js';
import { tasks } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { WebSocketServer } from 'ws';
import http from 'http';
import { sql } from 'drizzle-orm/sql';

async function unlockOpenBankingTask() {
  try {
    // Get the task first to verify it exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, 614));
    
    if (!task) {
      console.error('Task ID 614 not found');
      return;
    }
    
    console.log('Current task status:', {
      id: task.id,
      title: task.title,
      status: task.status,
      metadata: task.metadata
    });
    
    // Update the task status and metadata
    const updatedTask = await db.update(tasks)
      .set({
        status: 'not_started',
        metadata: sql`jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{locked}', 'false'
            ),
            '{prerequisite_completed}', 'true'
          ),
          '{prerequisite_completed_at}', to_jsonb(now())
        )`,
        updated_at: new Date()
      })
      .where(eq(tasks.id, 614))
      .returning();
    
    console.log('Task updated successfully:', {
      id: updatedTask[0].id,
      title: updatedTask[0].title,
      status: updatedTask[0].status,
      metadata: updatedTask[0].metadata
    });
    
    // Send WebSocket message to notify clients
    broadcastWebSocketMessage(614, {
      status: 'not_started',
      metadata: {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: new Date().toISOString()
      }
    });
    
    console.log('WebSocket notification sent');
    
    return updatedTask;
  } catch (error) {
    console.error('Error unlocking Open Banking task:', error);
  }
}

function broadcastWebSocketMessage(taskId, updateData) {
  // Create a temporary HTTP server and WebSocket server
  const server = http.createServer();
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Start the server on a temporary port
  server.listen(5001, async () => {
    console.log('Temporary WebSocket server started on port 5001');
    
    try {
      // Create a WebSocket client to connect to the main server
      const { WebSocket } = await import('ws');
      const ws = new WebSocket('ws://localhost:5000/ws');
      
      ws.on('open', () => {
        // Construct the message
        const message = {
          type: 'task_update',
          payload: {
            taskId: taskId,
            updates: updateData
          }
        };
        
        // Send the message
        ws.send(JSON.stringify(message));
        console.log('WebSocket message sent:', message);
        
        // Close the connection after sending
        setTimeout(() => {
          ws.close();
          server.close();
          console.log('Temporary WebSocket server closed');
        }, 1000);
      });
      
      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        server.close();
      });
    } catch (err) {
      console.error('Error creating WebSocket client:', err);
      server.close();
    }
  });
}

// Run the function
unlockOpenBankingTask()
  .then(() => {
    console.log('Open Banking task unlock complete');
  })
  .catch(console.error)
  .finally(() => {
    // Wait a moment for any async operations to complete
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });