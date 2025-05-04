/**
 * Fix Task 739 Progress
 * 
 * This script directly updates the progress for task 739 by running the unified progress
 * calculator and forcing a database update and WebSocket broadcast.
 */

import { pool } from './db/index.js';
import { calculateTaskProgress, updateAndBroadcastProgress } from './server/utils/unified-progress-calculator.js';

async function calculateActualProgress(taskId) {
  // Connect to the database
  const client = await pool.connect();
  
  try {
    // Calculate progress using the unified calculator
    const progress = await calculateTaskProgress(taskId, 'ky3p', { debug: true });
    
    console.log(`Task ${taskId} calculated progress: ${progress}%`);
    
    // Get current task data
    const { rows: [task] } = await client.query(
      'SELECT id, progress, status FROM tasks WHERE id = $1',
      [taskId]
    );
    
    console.log('Current task data in database:', task);
    
    return {
      calculatedProgress: progress,
      currentProgress: task.progress,
      currentStatus: task.status,
      taskId
    };
  } finally {
    client.release();
  }
}

async function fixTaskProgress(taskId) {
  try {
    // Get the actual progress
    const { calculatedProgress, currentProgress } = await calculateActualProgress(taskId);
    
    // If there's a discrepancy, update the progress
    if (calculatedProgress !== currentProgress) {
      console.log(`Updating task ${taskId} progress from ${currentProgress}% to ${calculatedProgress}%`);
      
      // Use the unified progress broadcast function to update the database and notify clients
      await updateAndBroadcastProgress(taskId, 'ky3p', {
        debug: true,
        forceProgress: calculatedProgress,
        metadata: {
          manualReconciliation: true,
          previousProgress: currentProgress,
          reconciliationDate: new Date().toISOString()
        }
      });
      
      console.log(`Successfully updated task ${taskId} progress to ${calculatedProgress}%`);
      return { success: true, taskId, progress: calculatedProgress };
    } else {
      console.log(`Task ${taskId} progress already correct (${currentProgress}%)`);
      return { success: true, taskId, progress: currentProgress, noChangeNeeded: true };
    }
  } catch (error) {
    console.error(`Error fixing task ${taskId} progress:`, error);
    return { success: false, taskId, error: error.message };
  }
}

// Execute the fix for task 739
fixTaskProgress(739)
  .then(result => {
    console.log('Fix result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
