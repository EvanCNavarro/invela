/**
 * Emergency script to directly unlock Open Banking task 614
 * This script directly unlocks the task in the database and
 * broadcasts a WebSocket update to the client
 */

// Import database connection
const { db } = require('./db');
const { tasks } = require('./db/schema');
const { eq } = require('drizzle-orm');
const { sql } = require('drizzle-orm/sql');
const { broadcastTaskUpdate } = require('./server/services/websocket');

// Task ID to unlock
const TASK_ID = 614;

async function unlockTask() {
  console.log(`[Task Unlocker] Directly unlocking task ID ${TASK_ID}`);
  
  try {
    // Get the task first to verify it exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TASK_ID));
    
    if (!task) {
      console.error(`[Task Unlocker] Task ID ${TASK_ID} not found`);
      return;
    }
    
    console.log(`[Task Unlocker] Found task: ${task.title} (type: ${task.task_type}, status: ${task.status})`);
    
    // Update the task status
    await db.update(tasks)
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
      .where(eq(tasks.id, TASK_ID));
    
    console.log(`[Task Unlocker] Task ${TASK_ID} unlocked successfully`);
    
    // Broadcast the update via WebSocket
    broadcastTaskUpdate({
      id: TASK_ID,
      status: 'not_started',
      metadata: {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: new Date().toISOString()
      }
    });
    
    console.log(`[Task Unlocker] WebSocket update broadcasted for task ${TASK_ID}`);
  } catch (error) {
    console.error(`[Task Unlocker] Error unlocking task: ${error.message}`);
  }
}

// Run the script
unlockTask()
  .then(() => {
    console.log('[Task Unlocker] Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error(`[Task Unlocker] Unhandled error: ${error.message}`);
    process.exit(1);
  });