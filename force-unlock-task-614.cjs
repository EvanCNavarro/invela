/**
 * Emergency script to directly unlock task ID 614 (Open Banking Survey)
 * 
 * This script:
 * 1. Directly updates the task's status to 'not_started'
 * 2. Sets metadata.locked to false
 * 3. Broadcasts a WebSocket update
 * 
 * Run with: node force-unlock-task-614.cjs
 */

// Import required modules
const { db } = require('@db');
const { tasks } = require('@db/schema');
const { eq } = require('drizzle-orm');
const { sql } = require('drizzle-orm/sql');
const WebSocket = require('ws');

// Constants
const TASK_ID = 614;
const WS_SERVER_PORT = 5000;
const WS_PATH = '/ws';

/**
 * Creates a WebSocket client and sends a message
 */
async function sendWebSocketMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      // Create WebSocket client
      const ws = new WebSocket(`ws://localhost:${WS_SERVER_PORT}${WS_PATH}`);
      
      ws.on('open', () => {
        console.log('[WebSocket] Connection established');
        
        // Send message
        const messageData = {
          type: 'task_update',
          payload: message
        };
        
        ws.send(JSON.stringify(messageData));
        console.log('[WebSocket] Message sent:', messageData);
        
        // Give some time for the message to be processed
        setTimeout(() => {
          ws.close();
          resolve();
        }, 500);
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

/**
 * Unlocks the task directly in the database
 */
async function unlockTask() {
  console.log(`[Task Unlocker] Unlocking task ID ${TASK_ID}...`);
  
  try {
    // First check if the task exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TASK_ID));
    
    if (!task) {
      console.error(`[Task Unlocker] Error: Task ID ${TASK_ID} not found`);
      return false;
    }
    
    console.log(`[Task Unlocker] Found task: ${task.title} (${task.task_type})`);
    console.log(`[Task Unlocker] Current status: ${task.status}`);
    
    // Update the task status and metadata
    const [updatedTask] = await db.update(tasks)
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
      .where(eq(tasks.id, TASK_ID))
      .returning();
    
    console.log(`[Task Unlocker] Task updated successfully`);
    console.log(`[Task Unlocker] New status: ${updatedTask.status}`);
    
    // Broadcast via WebSocket
    await sendWebSocketMessage({
      id: TASK_ID,
      status: 'not_started',
      metadata: {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: new Date().toISOString(),
        forceRefresh: true
      }
    });
    
    console.log(`[Task Unlocker] WebSocket notification sent`);
    return true;
  } catch (error) {
    console.error(`[Task Unlocker] Error unlocking task:`, error);
    return false;
  }
}

// Run the script
(async () => {
  try {
    const result = await unlockTask();
    if (result) {
      console.log(`[Task Unlocker] Task ${TASK_ID} successfully unlocked!`);
    } else {
      console.error(`[Task Unlocker] Failed to unlock task ${TASK_ID}`);
    }
  } catch (error) {
    console.error('[Task Unlocker] Unhandled error:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
})();