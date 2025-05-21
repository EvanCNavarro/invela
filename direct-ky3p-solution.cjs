/**
 * Direct Solution for KY3P Form Field Clearing
 * 
 * This script directly updates the database to manually clear KY3P task fields
 * and reset the task progress/status.
 */

// Import required modules
const { db } = require('@db');
const { ky3pResponses, tasks } = require('@db/schema');
const { eq } = require('drizzle-orm');
const { broadcastTaskUpdate } = require('./server/services/websocket');

// Task ID to clear - change this as needed
const taskId = 654;

async function directlyClearKy3pTask(taskId) {
  console.log(`[Direct Solution] Clearing KY3P task ${taskId}...`);
  
  try {
    // 1. Delete all responses for this task
    const deleteResult = await db.delete(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    console.log(`[Direct Solution] Deleted ${deleteResult.rowCount || 'unknown number of'} KY3P responses`);
    
    // 2. Update task status to not_started and progress to 0
    const updateResult = await db.update(tasks)
      .set({
        status: 'not_started',
        progress: 0,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    if (updateResult.length > 0) {
      const updatedTask = updateResult[0];
      console.log('[Direct Solution] Updated task:', {
        taskId,
        status: updatedTask.status,
        progress: updatedTask.progress
      });
      
      // 3. Broadcast the update to all WebSocket clients
      broadcastTaskUpdate({
        id: taskId,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: updatedTask.metadata || { locked: false }
      });
      
      console.log('[Direct Solution] Broadcast task update sent');
      
      return {
        success: true,
        taskId,
        status: updatedTask.status,
        progress: updatedTask.progress
      };
    } else {
      console.error('[Direct Solution] Failed to update task - no rows returned');
      return { success: false, error: 'No rows updated' };
    }
  } catch (error) {
    console.error('[Direct Solution] Error:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (require.main === module) {
  directlyClearKy3pTask(taskId)
    .then(result => {
      console.log('[Direct Solution] Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Direct Solution] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { directlyClearKy3pTask };