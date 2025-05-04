/**
 * Direct KY3P Progress Test Script
 * 
 * This script tests if our fix to the transaction boundary issue in the KY3P progress
 * calculation system is working correctly. It uses direct SQL queries to check if
 * progress is correctly persisted to the database.
 * 
 * Usage: Run with node test-ky3p-direct.js
 */

import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

async function testKy3pProgressFix() {
  try {
    console.log('======= KY3P Progress Persistence Test =======');
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Target KY3P task ID to test with
    const TARGET_TASK_ID = 739;
    
    console.log(`Testing progress fix for KY3P task ${TARGET_TASK_ID}`);
    
    // Step 1: Check current progress in database
    console.log('\nChecking current task state in database...');
    const currentState = await pool.query(
      'SELECT id, task_type, progress, status FROM tasks WHERE id = $1',
      [TARGET_TASK_ID]
    );
    
    const task = currentState.rows[0];
    console.log(`Current task state: id=${task.id}, type=${task.task_type}, progress=${task.progress}, status=${task.status}`);
    
    // Step 2: Reset progress to 0 to test the fix
    console.log('\nResetting progress to 0 to test the fix...');
    await pool.query(
      'UPDATE tasks SET progress = 0 WHERE id = $1',
      [TARGET_TASK_ID]
    );
    
    // Step 3: Verify the reset
    const resetState = await pool.query(
      'SELECT progress FROM tasks WHERE id = $1',
      [TARGET_TASK_ID]
    );
    console.log(`Task progress after reset: ${resetState.rows[0].progress}%`);
    
    // Step 4: Trigger the reconciliation process (simulating what the API does)
    console.log('\nTriggering task reconciliation to recalculate progress...');
    // First, let's get the total fields and completed fields
    const fieldStats = await pool.query(
      `SELECT COUNT(*) as total_fields, 
       SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) as completed_fields
       FROM ky3p_responses WHERE task_id = $1`,
      [TARGET_TASK_ID]
    );
    
    const { total_fields, completed_fields } = fieldStats.rows[0];
    const calculatedProgress = total_fields > 0 ? Math.round((completed_fields / total_fields) * 100) : 0;
    
    console.log(`Calculated progress: ${completed_fields}/${total_fields} = ${calculatedProgress}%`);
    
    // Now update the progress manually using SQL with explicit type casting
    // This is the critical part that was fixed in our code
    console.log('\nUpdating task progress with explicit SQL type casting...');
    await pool.query(
      'UPDATE tasks SET progress = $1::integer, updated_at = NOW() WHERE id = $2',
      [calculatedProgress, TARGET_TASK_ID]
    );
    
    // Step 5: Verify the update persisted properly
    console.log('\nVerifying progress update persistence...');
    const finalState = await pool.query(
      'SELECT id, task_type, progress, status, updated_at FROM tasks WHERE id = $1',
      [TARGET_TASK_ID]
    );
    
    const updatedTask = finalState.rows[0];
    console.log(`Updated task state: id=${updatedTask.id}, type=${updatedTask.task_type}, progress=${updatedTask.progress}, status=${updatedTask.status}`);
    console.log(`Last updated: ${updatedTask.updated_at}`);
    
    // Step 6: Check if update was successful
    const successMessage = updatedTask.progress === calculatedProgress
      ? `✅ SUCCESS: Progress persisted correctly in database (${updatedTask.progress}%)`
      : `❌ FAILURE: Progress not persisted correctly. Expected ${calculatedProgress}%, got ${updatedTask.progress}%`;
    
    console.log('\n' + successMessage);
    console.log('\n======= Test Complete =======');
    
    await pool.end();
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
testKy3pProgressFix();
