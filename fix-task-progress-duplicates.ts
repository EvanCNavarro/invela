/**
 * Fix Task Progress Duplicates
 * 
 * This script resolves the issue of duplicate progress tracking by ensuring
 * that all tasks use only the primary progress field, following the KISS principle.
 * 
 * It specifically addresses cases where progress is tracked in both:
 * 1. The primary 'progress' column
 * 2. The metadata.progressValue field
 * 
 * For tasks where these values differ, this script updates the primary progress field
 * to match the metadata value, then eliminates the duplicate progress value from metadata.
 */

import { db } from './db';
import { tasks } from './db/schema';
import { eq } from 'drizzle-orm';

const TARGET_TASK_IDS = [694]; // Specifically target the KY3P task we identified with issues

/**
 * Fix duplicate progress tracking for a single task
 */
async function fixTaskProgress(taskId: number): Promise<{
  taskId: number;
  fixed: boolean;
  oldProgress: number;
  newProgress: number;
  message: string;
}> {
  try {
    // Step 1: Get the current task data
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    
    if (!task) {
      return {
        taskId,
        fixed: false,
        oldProgress: 0,
        newProgress: 0,
        message: 'Task not found'
      };
    }
    
    // Step 2: Check if the task has duplicate progress tracking
    const metadata = task.metadata || {};
    const progressValue = metadata.progressValue;
    
    if (progressValue === undefined) {
      return {
        taskId,
        fixed: false,
        oldProgress: task.progress,
        newProgress: task.progress,
        message: 'No duplicate progress value found in metadata'
      };
    }
    
    // Step 3: Check if the values differ
    if (task.progress === progressValue) {
      // Step 3a: Values match, just remove the duplicate from metadata
      const updatedMetadata = { ...metadata };
      delete updatedMetadata.progressValue;
      
      await db.update(tasks)
        .set({
          metadata: updatedMetadata
        })
        .where(eq(tasks.id, taskId));
      
      return {
        taskId,
        fixed: true,
        oldProgress: task.progress,
        newProgress: task.progress,
        message: 'Removed duplicate progress from metadata (values already matched)'
      };
    }
    
    // Step 3b: Values differ, update primary progress to match metadata
    const updatedMetadata = { ...metadata };
    delete updatedMetadata.progressValue;
    
    await db.update(tasks)
      .set({
        progress: progressValue,
        metadata: updatedMetadata
      })
      .where(eq(tasks.id, taskId));
    
    return {
      taskId,
      fixed: true,
      oldProgress: task.progress,
      newProgress: progressValue,
      message: `Updated primary progress from ${task.progress} to ${progressValue} and removed duplicate`
    };
  } catch (error) {
    console.error(`Error fixing task ${taskId}:`, error);
    return {
      taskId,
      fixed: false,
      oldProgress: 0,
      newProgress: 0,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main function to fix all specified tasks
 */
async function fixDuplicateProgressFields() {
  console.log(`[Progress Fix] Starting fix for ${TARGET_TASK_IDS.length} specifically targeted tasks`);
  
  for (const taskId of TARGET_TASK_IDS) {
    console.log(`[Progress Fix] Processing task ${taskId}...`);
    
    const result = await fixTaskProgress(taskId);
    
    console.log(`[Progress Fix] Result for task ${taskId}:`, result);
  }
  
  console.log(`[Progress Fix] Fix completed for specifically targeted tasks`);
  
  // Find and fix all other tasks with duplicate progress tracking
  const allTasks = await db.select({
    id: tasks.id,
    progress: tasks.progress,
    metadata: tasks.metadata
  }).from(tasks);
  
  const tasksWithDuplicates = allTasks.filter(task => 
    task.metadata && 
    task.metadata.progressValue !== undefined && 
    !TARGET_TASK_IDS.includes(task.id)
  );
  
  console.log(`[Progress Fix] Found ${tasksWithDuplicates.length} additional tasks with duplicate progress tracking`);
  
  for (const task of tasksWithDuplicates) {
    console.log(`[Progress Fix] Processing additional task ${task.id}...`);
    
    const result = await fixTaskProgress(task.id);
    
    console.log(`[Progress Fix] Result for additional task ${task.id}:`, result);
  }
  
  console.log(`[Progress Fix] All fixes completed successfully`);
}

// Run the script
fixDuplicateProgressFields().then(() => {
  console.log('[Progress Fix] Script execution completed');
  process.exit(0);
}).catch(error => {
  console.error('[Progress Fix] Script execution failed:', error);
  process.exit(1);
});
