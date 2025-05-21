/**
 * Fix for task 739 progress - Broadcast update
 * 
 * This script broadcasts a task update for task 739
 * to notify clients that the progress has been updated to 3%
 */

import { broadcastTaskUpdate } from './server/services/websocket.js';

// Broadcast update for task 739
async function broadcastUpdate() {
  try {
    const taskId = 739;
    const progress = 3;
    const status = 'in_progress';
    
    // Send the update
    await broadcastTaskUpdate({
      id: taskId,
      status,
      progress,
      metadata: {
        manualReconciliation: true,
        lastProgressUpdate: new Date().toISOString(),
        previousProgress: 0,
        previousStatus: 'not_started'
      },
      timestamp: new Date().toISOString()
    });
    
    console.log(`Successfully broadcasted update for task ${taskId}: ${progress}% - ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error broadcasting update:', error);
    return { success: false, error: String(error) };
  }
}

// Execute and exit
broadcastUpdate()
  .then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
