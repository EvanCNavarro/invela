/**
 * General-purpose task unlocker script
 * Usage: node task-unlocker.js [taskId]
 *
 * This script can be used to manually unlock any task that is stuck in "locked" state.
 * This is particularly useful for troubleshooting task dependency chain issues.
 */

import { spawn } from 'child_process';

// Get the task ID from command-line arguments or use default
const taskId = process.argv[2] || 594;

console.log(`Unlocking task ${taskId}...`);

// Execute the direct SQL command to unlock the task
const updateProcess = spawn('psql', [
  process.env.DATABASE_URL,
  '-c',
  `UPDATE tasks SET 
     metadata = jsonb_set(
       jsonb_set(
         jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{locked}', 
           'false'
         ),
         '{prerequisite_completed}',
         'true'
       ),
       '{prerequisite_completed_at}',
       concat('"', NOW()::text, '"')::jsonb
     ),
     status = CASE WHEN status = 'locked' THEN 'not_started' ELSE status END,
     updated_at = NOW()
   WHERE id = ${taskId};`
]);

updateProcess.stdout.on('data', (data) => {
  console.log(`SQL output: ${data}`);
});

updateProcess.stderr.on('data', (data) => {
  console.error(`SQL error: ${data}`);
});

updateProcess.on('close', (code) => {
  console.log(`SQL process exited with code ${code}`);
  
  if (code === 0) {
    // Send broadcast to update UI
    console.log('Sending WebSocket broadcast...');
    const broadcastProcess = spawn('curl', [
      '-X', 'POST',
      `http://localhost:5000/api/tasks/${taskId}/broadcast`
    ]);
    
    broadcastProcess.on('close', (code) => {
      console.log(`Broadcast process exited with code ${code}`);
      console.log('Task unlock complete. Check UI to verify.');
      
      // Now fetch the updated task details
      console.log('Fetching updated task details...');
      const detailsProcess = spawn('psql', [
        process.env.DATABASE_URL,
        '-c',
        `SELECT id, title, status, task_type, metadata->>'locked' AS is_locked FROM tasks WHERE id = ${taskId};`
      ]);
      
      detailsProcess.stdout.on('data', (data) => {
        console.log(`\nUpdated task details:\n${data}`);
      });
    });
  }
});