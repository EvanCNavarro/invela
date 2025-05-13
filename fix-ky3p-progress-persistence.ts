/**
 * KY3P Progress Persistence Fix
 * 
 * This script fixes the issue where KY3P task progress is correctly calculated
 * but not properly persisted to the database. It uses direct database transactions
 * with explicit type handling to ensure progress values are correctly stored.
 * 
 * Usage: npx tsx fix-ky3p-progress-persistence.ts [taskId]
 * Without a task ID, it will find all KY3P tasks with progress discrepancies.
 */

// Import from standard paths matching project structure
import { db } from './server/db';
import { eq, and, sql } from 'drizzle-orm';
import { tasks, ky3pResponses, ky3pFields } from './db/schema';
import { updateKy3pProgressFixed } from './server/utils/unified-progress-fixed';

/**
 * Check if a task's progress is incorrect
 * 
 * @param taskId Task ID to check
 * @returns Object with task details and progress information
 */
async function checkTaskProgress(taskId: number): Promise<{
  taskId: number;
  taskType: string;
  storedProgress: number;
  calculatedProgress: number;
  hasDiscrepancy: boolean;
}> {
  console.log(`Checking task ${taskId}...`);
  
  // Get the task
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  if (!task.task_type.toLowerCase().includes('ky3p') && 
      !task.task_type.toLowerCase().includes('security')) {
    throw new Error(`Task ${taskId} is not a KY3P task (type: ${task.task_type})`);
  }
  
  // Calculate the actual progress based on completed responses
  // Count total KY3P fields
  const totalFieldsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ky3pFields);
  const totalFields = totalFieldsResult[0].count;
  
  // Count completed KY3P responses
  const completedFieldsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ky3pResponses)
    .where(
      and(
        eq(ky3pResponses.task_id, taskId),
        eq(ky3pResponses.status, 'COMPLETE')
      )
    );
  const completedFields = completedFieldsResult[0].count;
  
  // Calculate progress percentage
  const calculatedProgress = totalFields > 0 ? 
    Math.min(100, Math.round((completedFields / totalFields) * 100)) : 0;
  
  // Get the stored progress
  const storedProgress = Number(task.progress);
  
  // Check if there's a discrepancy
  const hasDiscrepancy = storedProgress !== calculatedProgress;
  
  return {
    taskId,
    taskType: task.task_type,
    storedProgress,
    calculatedProgress,
    hasDiscrepancy
  };
}

/**
 * Fix the progress for a KY3P task
 * 
 * @param taskId Task ID to fix
 * @returns Result of the fix operation
 */
async function fixTaskProgress(taskId: number): Promise<{
  taskId: number;
  taskType: string;
  oldProgress: number;
  newProgress: number;
  success: boolean;
  message: string;
}> {
  try {
    // First check the current progress
    const check = await checkTaskProgress(taskId);
    
    if (!check.hasDiscrepancy) {
      return {
        taskId,
        taskType: check.taskType,
        oldProgress: check.storedProgress,
        newProgress: check.calculatedProgress,
        success: true,
        message: `No discrepancy found, progress already correct: ${check.calculatedProgress}%`
      };
    }
    
    console.log(`Fixing task ${taskId} progress: ${check.storedProgress}% -> ${check.calculatedProgress}%`);
    
    // Use the fixed update function
    const result = await updateKy3pProgressFixed(taskId, {
      debug: true,
      forceUpdate: true,
      metadata: {
        progressFixed: true,
        fixedAt: new Date().toISOString(),
        previousProgress: check.storedProgress
      }
    });
    
    // Verify the fix worked
    const verifyCheck = await checkTaskProgress(taskId);
    
    return {
      taskId,
      taskType: check.taskType,
      oldProgress: check.storedProgress,
      newProgress: verifyCheck.storedProgress,
      success: !verifyCheck.hasDiscrepancy && result.success,
      message: result.message
    };
  } catch (error) {
    return {
      taskId,
      taskType: 'unknown',
      oldProgress: 0,
      newProgress: 0,
      success: false,
      message: `Error fixing task progress: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Find all KY3P tasks with progress discrepancies
 * 
 * @returns Array of tasks with progress discrepancies
 */
async function findTasksWithProgressDiscrepancies(): Promise<{
  taskId: number;
  taskType: string;
  storedProgress: number;
  calculatedProgress: number;
}[]> {
  console.log('Finding KY3P tasks with progress discrepancies...');
  
  // Get all KY3P tasks
  const ky3pTasks = await db
    .select()
    .from(tasks)
    .where(
      sql`LOWER(${tasks.task_type}) LIKE '%ky3p%' OR LOWER(${tasks.task_type}) LIKE '%security%'`
    );
  
  console.log(`Found ${ky3pTasks.length} KY3P tasks`);
  
  // Check each task's progress
  const results = [];
  
  for (const task of ky3pTasks) {
    try {
      const check = await checkTaskProgress(task.id);
      
      if (check.hasDiscrepancy) {
        results.push({
          taskId: task.id,
          taskType: task.task_type,
          storedProgress: check.storedProgress,
          calculatedProgress: check.calculatedProgress
        });
      }
    } catch (error) {
      console.error(`Error checking task ${task.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Get task ID from command line if provided
    const taskId = process.argv[2] ? parseInt(process.argv[2]) : null;
    
    if (taskId) {
      // Fix a specific task
      console.log(`Fixing KY3P task ${taskId}...`);
      
      const result = await fixTaskProgress(taskId);
      
      console.log('Fix result:', result);
    } else {
      // Find and fix all tasks with discrepancies
      const discrepancies = await findTasksWithProgressDiscrepancies();
      
      console.log(`Found ${discrepancies.length} tasks with progress discrepancies:`);
      console.table(discrepancies);
      
      if (discrepancies.length > 0) {
        console.log('\nFixing tasks with discrepancies...');
        
        const fixResults = [];
        
        for (const task of discrepancies) {
          console.log(`\nFixing task ${task.taskId}...`);
          
          const result = await fixTaskProgress(task.taskId);
          fixResults.push(result);
          
          // Add a small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\nFix results:');
        console.table(fixResults);
        
        // Summary of fixed and failed tasks
        const fixedCount = fixResults.filter(r => r.success).length;
        const failedCount = fixResults.length - fixedCount;
        
        console.log(`\nSummary: Fixed ${fixedCount} tasks, ${failedCount} failed`);
      }
    }
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
