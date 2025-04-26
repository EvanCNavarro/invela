/**
 * Direct Fix for KY3P Task 654 - SQL-based approach
 * 
 * This script directly executes SQL queries to reset the task to "not_started" state
 * and delete all KY3P responses for the task.
 */

// Load required modules
const { pool } = require('@db');
const { broadcastTaskUpdate } = require('./server/services/websocket');

// Task ID to fix
const TASK_ID = 654;

async function fixKy3pTask() {
  // Get a client from the pool
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log(`[Direct Fix] Starting fix for KY3P task ${TASK_ID}`);
    
    // Delete all responses for this task
    const deleteResult = await client.query(
      'DELETE FROM ky3p_responses WHERE task_id = $1',
      [TASK_ID]
    );
    
    console.log(`[Direct Fix] Deleted ${deleteResult.rowCount} KY3P responses`);
    
    // Update task status and progress
    const updateResult = await client.query(
      `UPDATE tasks 
       SET status = 'not_started', 
           progress = 0, 
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, status, progress, metadata`,
      [TASK_ID]
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    if (updateResult.rows.length > 0) {
      const task = updateResult.rows[0];
      console.log('[Direct Fix] Updated task:', {
        taskId: task.id,
        status: task.status,
        progress: task.progress
      });
      
      // Broadcast the update to all WebSocket clients
      broadcastTaskUpdate({
        id: task.id,
        status: task.status,
        progress: task.progress,
        metadata: task.metadata || { locked: false }
      });
      
      console.log('[Direct Fix] Broadcast task update sent');
      
      return {
        success: true,
        taskId: task.id,
        status: task.status,
        progress: task.progress
      };
    } else {
      throw new Error('No rows updated - task may not exist');
    }
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('[Direct Fix] Error:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Self-executing async function
(async () => {
  try {
    const result = await fixKy3pTask();
    console.log('[Direct Fix] Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('[Direct Fix] Fatal error:', error);
    process.exit(1);
  }
})();