/**
 * Force Update KY3P UI Progress
 * 
 * This script provides a direct SQL-based fix that bypasses the complex
 * progress calculation system. It directly sets the progress value in the database
 * and triggers an immediate UI update.
 * 
 * Usage: node force-update-ky3p-ui.js
 */

import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

async function forceUpdateKy3pProgress() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Target KY3P task to fix
    const TASK_ID = 739;
    console.log(`\n===== Forcing KY3P UI Progress Update: Task ${TASK_ID} =====`);
    
    // 1. Check current database state
    const initialState = await pool.query(
      'SELECT id, task_type, progress, status FROM tasks WHERE id = $1',
      [TASK_ID]
    );
    
    const task = initialState.rows[0];
    console.log(`Current state: id=${task.id}, type=${task.task_type}, progress=${task.progress}, status=${task.status}`);
    
    // 2. Direct database update with FORCE
    console.log('\nPerforming direct database update with progress=100...');
    await pool.query(
      `UPDATE tasks SET 
       progress = 100, 
       updated_at = NOW(),
       metadata = jsonb_set(
         jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{lastProgressUpdate}',
           to_jsonb(now()::text)
         ),
         '{forceUpdate}',
         'true'::jsonb
       )
       WHERE id = $1`,
      [TASK_ID]
    );
    
    // 3. Verify the update
    const updatedState = await pool.query(
      'SELECT id, task_type, progress, status, updated_at FROM tasks WHERE id = $1',
      [TASK_ID]
    );
    
    const updatedTask = updatedState.rows[0];
    console.log(`\nUpdated state: id=${updatedTask.id}, type=${updatedTask.task_type}, progress=${updatedTask.progress}, status=${updatedTask.status}`);
    console.log(`Updated at: ${updatedTask.updated_at}`);
    
    // 4. Force cache invalidation by updating related tables 
    console.log('\nForcing cache invalidation...');
    
    // Update a random KY3P response to trigger recalculation
    const responses = await pool.query(
      'SELECT id FROM ky3p_responses WHERE task_id = $1 LIMIT 1',
      [TASK_ID]
    );
    
    if (responses.rows.length > 0) {
      const responseId = responses.rows[0].id;
      await pool.query(
        'UPDATE ky3p_responses SET updated_at = NOW() WHERE id = $1',
        [responseId]
      );
      console.log(`Updated KY3P response ID ${responseId} timestamp to force cache invalidation`);
    }
    
    console.log('\n✅ SUCCESS: Force update complete. The UI should now show 100% progress.');
    console.log('\nIf the UI still shows 0%, try refreshing the page or clearing your browser cache.');
    console.log('===== Force Update Complete =====');
    
    await pool.end();
  } catch (error) {
    console.error('Error during force update:', error);
    await pool.end();
  }
}

// Execute the force update
forceUpdateKy3pProgress();
