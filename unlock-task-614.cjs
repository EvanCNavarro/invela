/**
 * Direct fix to unlock Open Banking Survey task (ID: 614)
 */

const { Pool } = require('pg');

async function unlockTask() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connecting to database...');
    
    // Get current task info
    const currentTask = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [614]
    );
    
    console.log('Current task status:', {
      id: currentTask.rows[0].id,
      title: currentTask.rows[0].title, 
      status: currentTask.rows[0].status,
      metadata: currentTask.rows[0].metadata
    });
    
    // Update the task to unlock it
    const result = await pool.query(
      `UPDATE tasks 
       SET status = 'not_started',
           metadata = jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{locked}', 'false'
               ),
               '{prerequisite_completed}', 'true'
             ),
             '{prerequisite_completed_at}', to_jsonb(now())
           ),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [614]
    );
    
    console.log('Task unlocked successfully:', {
      id: result.rows[0].id,
      title: result.rows[0].title,
      status: result.rows[0].status,
      metadata: result.rows[0].metadata
    });
    
    // Send broadcast via WebSocket using simple HTTP request
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Call internal API to broadcast task update
    try {
      console.log('Sending WebSocket broadcast...');
      await fetch('http://localhost:5000/api/internal/broadcast-task-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 614,
          updates: {
            status: 'not_started',
            metadata: {
              locked: false,
              prerequisite_completed: true,
              prerequisite_completed_at: new Date().toISOString()
            }
          }
        })
      });
      console.log('WebSocket broadcast sent successfully');
    } catch (err) {
      console.error('Failed to send WebSocket broadcast:', err);
    }
  } catch (err) {
    console.error('Error unlocking task:', err);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

unlockTask().catch(console.error);