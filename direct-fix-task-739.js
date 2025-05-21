/**
 * Direct Fix for Task 739 Progress
 * 
 * This script directly updates the progress for task 739 in the database
 * and broadcasts the update via the WebSocket server.
 */

const { exec } = require('child_process');
const fs = require('fs');

// Generate a temporary SQL file
const sqlContent = `
-- Calculate progress (4 complete responses out of 120 fields = 3.33% rounded to 3%)
UPDATE tasks 
SET progress = 3, 
    status = 'in_progress', 
    metadata = jsonb_set(
        jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{progressHistoryEntry}',
            '{"value": 3, "timestamp": "' || NOW()::text || '"}'
        ),
        '{lastProgressUpdate}',
        '"' || NOW()::text || '"'
    ) 
WHERE id = 739;

-- Verify the update
SELECT id, progress, status FROM tasks WHERE id = 739;
`;

fs.writeFileSync('fix-task-739.sql', sqlContent);

// Execute the SQL file
exec(`psql $DATABASE_URL -f fix-task-739.sql`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing SQL: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('SQL execution output:');
  console.log(stdout);
  
  // Now broadcast the update via the WebSocket server
  const broadcastScript = `
  const broadcastTaskUpdate = async (taskId, progress, status) => {
    // Import WebSocket service
    const { broadcastTaskUpdate } = await import('./server/services/websocket.js');
    
    // Broadcast the update
    await broadcastTaskUpdate({
      id: taskId,
      status,
      progress,
      metadata: {
        manualReconciliation: true,
        lastProgressUpdate: new Date().toISOString()
      }
    });
    
    console.log(`Successfully broadcasted task update: Task ${taskId} - ${progress}% - ${status}`);
  };
  
  // Broadcast update for task 739
  broadcastTaskUpdate(739, 3, 'in_progress')
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error broadcasting update:', error);
      process.exit(1);
    });
  `;
  
  fs.writeFileSync('broadcast-task-739.js', broadcastScript);
  
  // Execute the broadcast script
  exec('node broadcast-task-739.js', (broadcastError, broadcastStdout, broadcastStderr) => {
    if (broadcastError) {
      console.error(`Error broadcasting update: ${broadcastError.message}`);
      console.error(broadcastStderr);
      process.exit(1);
    }
    
    console.log('Broadcast result:');
    console.log(broadcastStdout);
    
    // Clean up temporary files
    fs.unlinkSync('fix-task-739.sql');
    fs.unlinkSync('broadcast-task-739.js');
    
    console.log('Fix completed successfully!');
    process.exit(0);
  });
});
