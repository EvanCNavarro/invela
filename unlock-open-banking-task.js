/**
 * Simple script to directly unlock the Open Banking Survey task
 * Usage: node unlock-open-banking-task.js
 */

import { spawn } from 'child_process';
const taskId = 594; // The Open Banking Survey task ID

console.log(`Unlocking task ${taskId}...`);

// Execute the direct SQL command to unlock the task
const updateProcess = spawn('psql', [
  process.env.DATABASE_URL,
  '-c',
  `UPDATE tasks SET 
     metadata = jsonb_set(jsonb_set(metadata, '{locked}', 'false'), '{prerequisite_completed}', 'true'),
     status = 'not_started' 
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
    });
  }
});