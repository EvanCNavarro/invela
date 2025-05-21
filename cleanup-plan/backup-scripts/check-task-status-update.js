/**
 * Task Status Update Test
 * 
 * This script tests the database update for task status to ensure that 
 * the SQL query we're using in the transactional form handler works correctly.
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

async function testTaskStatusUpdate(taskId = 758) {
  console.log(`Testing status update for task ${taskId}...`);
  
  // Use a transaction to ensure we can roll back the changes
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
      return;
    }
    
    const currentTask = currentStatusResult.rows[0];
    console.log('Current task state:', currentTask);
    
    // Perform the same update we're using in the transactional-form-handler.ts
    const submissionDate = new Date().toISOString();
    
    // Use the fixed jsonb_set syntax
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
    } else {
      console.error('❌ Task update failed! No rows were updated.');
    }
    
    // For safety, roll back the transaction by default
    // Change to COMMIT to make changes permanent
    console.log('Rolling back transaction (update was just a test)');
    await client.query('ROLLBACK');
    
    // Verify the rollback worked
    const finalStatusResult = await client.query(
      `SELECT id, status, progress, updated_at FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (finalStatusResult.rows.length > 0) {
      console.log('Task state after rollback:', finalStatusResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error during task update test:', error);
    // Make sure to roll back if there's an error
    await client.query('ROLLBACK').catch(err => console.error('Rollback error:', err));
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the test
testTaskStatusUpdate()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Unhandled error:', err))
  .finally(() => pool.end());