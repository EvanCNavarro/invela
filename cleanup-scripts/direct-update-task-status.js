/**
 * Direct Task Status Update Script
 * 
 * This script provides a way to directly update the status of a task to "submitted"
 * using our fixed SQL query. It can be used as a manual intervention tool
 * for when the normal form submission process isn't working.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Initialize DB connection from environment
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false
};

const pool = new Pool(dbConfig);

/**
 * Directly update a task status to "submitted"
 * 
 * @param {number} taskId The ID of the task to update
 * @param {boolean} commit Whether to commit (true) or rollback (false) the transaction
 * @returns {Promise<object>} The result of the operation
 */
async function directUpdateTaskStatus(taskId, commit = false) {
  console.log(`Direct update of task ${taskId} to "submitted" status (commit: ${commit})`);
  
  // Use a transaction to ensure data consistency
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // First, check current status
    const currentStatusResult = await client.query(
      `SELECT id, status, progress, updated_at FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (currentStatusResult.rows.length === 0) {
      console.error(`❌ Task ${taskId} not found!`);
      await client.query('ROLLBACK');
      return { success: false, error: 'Task not found' };
    }
    
    const currentTask = currentStatusResult.rows[0];
    console.log('Current task state:', currentTask);
    
    // Generate timestamp
    const submissionDate = new Date().toISOString();
    
    // Use the fixed SQL query with 'true'::jsonb
    // This is the same query that was fixed in transactional-form-handler.ts
    const updateResult = await client.query(
      `UPDATE tasks 
       SET status = 'submitted', 
           progress = 100, 
           metadata = jsonb_set(
             jsonb_set(COALESCE(metadata, '{}'::jsonb), '{submitted}', 'true'::jsonb),
             '{submissionDate}', to_jsonb($2::text)
           ),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, progress, metadata`,
      [taskId, submissionDate]
    );
    
    // Check if update was successful
    if (updateResult.rowCount > 0) {
      const updatedTask = updateResult.rows[0];
      console.log('✅ Task update successful!');
      console.log('Updated task state:', updatedTask);
      
      // Verify metadata
      console.log('Metadata:', updatedTask.metadata);
      console.log('Is submitted flag set:', updatedTask.metadata?.submitted);
      console.log('Submission date:', updatedTask.metadata?.submissionDate);
      
      // Commit or rollback based on the commit parameter
      if (commit) {
        console.log('Committing transaction - changes will be permanent');
        await client.query('COMMIT');
        console.log('Transaction committed successfully');
      } else {
        console.log('Rolling back transaction (update was just a test)');
        await client.query('ROLLBACK');
        console.log('Transaction rolled back successfully');
        
        // Verify the rollback worked
        const finalStatusResult = await client.query(
          `SELECT id, status, progress, updated_at FROM tasks WHERE id = $1`,
          [taskId]
        );
        
        if (finalStatusResult.rows.length > 0) {
          console.log('Task state after rollback:', finalStatusResult.rows[0]);
        }
      }
      
      return { 
        success: true, 
        task: updatedTask,
        committed: commit
      };
    } else {
      console.error('❌ Task update failed! No rows were updated.');
      await client.query('ROLLBACK');
      return { success: false, error: 'Update failed, no rows affected' };
    }
    
  } catch (error) {
    console.error('❌ Error during task update:', error);
    // Make sure to roll back if there's an error
    await client.query('ROLLBACK').catch(err => console.error('Rollback error:', err));
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Check arguments
const args = process.argv.slice(2);
const taskId = parseInt(args[0]) || 758; // Default to task 758 if not specified
const commit = args[1] === 'commit'; // Add 'commit' as second argument to commit changes

// Run the update
directUpdateTaskStatus(taskId, commit)
  .then(result => {
    console.log('Operation result:', result);
    if (result.success && result.committed) {
      console.log(`✅ Task ${taskId} has been successfully updated to "submitted" status`);
    } else if (result.success) {
      console.log(`✓ Update test successful, but changes were rolled back. Run with 'commit' to make changes permanent.`);
    } else {
      console.error(`❌ Update failed: ${result.error}`);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
  })
  .finally(() => {
    pool.end();
  });