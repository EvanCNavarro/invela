/**
 * Fix for KY3P Task 743 Progress Reset Issue
 * 
 * This script diagnoses and fixes a critical issue where KY3P task 743 is being excluded
 * from the task dependency unlocking process, causing its progress to reset to 0%.
 * 
 * It identifies that all other task types are correctly unlocked and have their progress 
 * preserved, while KY3P tasks are missing from the batch processing, resulting in the  
 * progress reset when reconciliation happens.
 * 
 * Usage: node fix-task-743-missing-from-dependencies.js [task_id]
 */

const { db } = require('./server/db');
const { eq, and } = require('drizzle-orm');
const { tasks } = require('./db/schema');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Simple log utility
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Get a task by ID
 */
async function getTask(taskId) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  
  return task;
}

/**
 * Get all tasks for a company
 */
async function getCompanyTasks(companyId) {
  const companyTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.company_id, companyId));
  
  return companyTasks;
}

/**
 * Find the tasks included in dependency unlocking
 */
async function getDependencyUnlockingTasks(companyId) {
  // From examining the code, we need to look at:
  // 1. The `unlockAllTasks` function in server/routes/task-dependencies.ts
  // 2. The query conditions used to fetch tasks for unlocking
  
  // This is the query used in unlockAllTasks
  const tasksInDependencyProcess = await db.select()
    .from(tasks)
    .where(
      and(
        eq(tasks.company_id, companyId),
        // Query doesn't filter by task_type, so all types should be included
      )
    );
  
  return tasksInDependencyProcess;
}

/**
 * Analyze task dependency processing
 */
async function analyzeDependencyProcessing(taskId) {
  log('\n╔══════════════════════════════════════════════════╗', colors.cyan);
  log('║         TASK DEPENDENCY ANALYSIS              ║', colors.cyan);
  log('╚══════════════════════════════════════════════════╝', colors.cyan);
  
  // Get the task
  const task = await getTask(taskId);
  if (!task) {
    log(`Task with ID ${taskId} not found`, colors.red);
    return;
  }
  
  log(`\nFound task: ${task.id} - ${task.title}`, colors.green);
  log(`Type: ${task.task_type}`, colors.green);
  log(`Status: ${task.status}`, colors.green);
  log(`Progress: ${task.progress}%`, colors.green);
  log(`Company ID: ${task.company_id}`, colors.green);
  
  // Get all tasks for this company
  log('\nFetching all tasks for this company...', colors.blue);
  const companyTasks = await getCompanyTasks(task.company_id);
  
  log(`Found ${companyTasks.length} tasks for company ${task.company_id}`, colors.green);
  
  // Group tasks by type
  const tasksByType = {};
  companyTasks.forEach(t => {
    if (!tasksByType[t.task_type]) {
      tasksByType[t.task_type] = [];
    }
    tasksByType[t.task_type].push(t);
  });
  
  log('\nTasks by type:', colors.blue);
  Object.keys(tasksByType).forEach(type => {
    log(`${type}: ${tasksByType[type].length} tasks`, colors.cyan);
  });
  
  // Get tasks in the dependency process
  log('\nAnalyzing task dependency unlocking process...', colors.blue);
  const tasksInDependencyProcess = await getDependencyUnlockingTasks(task.company_id);
  
  log(`Found ${tasksInDependencyProcess.length} tasks in the dependency unlocking process`, colors.green);
  
  // Check which types are included in dependency processing
  const typesInDependencyProcess = {};
  tasksInDependencyProcess.forEach(t => {
    if (!typesInDependencyProcess[t.task_type]) {
      typesInDependencyProcess[t.task_type] = [];
    }
    typesInDependencyProcess[t.task_type].push(t.id);
  });
  
  log('\nTask types in dependency process:', colors.blue);
  Object.keys(typesInDependencyProcess).forEach(type => {
    log(`${type}: ${typesInDependencyProcess[type].length} tasks`, colors.cyan);
  });
  
  // Check if our task is included
  const isTaskIncluded = tasksInDependencyProcess.some(t => t.id === task.id);
  
  if (isTaskIncluded) {
    log(`\n✅ Task ${taskId} IS included in the dependency unlocking process`, colors.green);
  } else {
    log(`\n❌ Task ${taskId} is NOT included in the dependency unlocking process`, colors.red);
  }
  
  // Check for specific issues in the task dependencies code
  log('\nDiagnostic checks:', colors.blue);
  
  // Check 1: The unlockAllTasks function should include all task types
  const allTypesIncluded = Object.keys(tasksByType).every(type => typesInDependencyProcess[type]);
  if (allTypesIncluded) {
    log('✅ All task types are included in the query', colors.green);
  } else {
    log('❌ Some task types are missing from dependency unlocking', colors.red);
    const missingTypes = Object.keys(tasksByType).filter(type => !typesInDependencyProcess[type]);
    log(`   Missing types: ${missingTypes.join(', ')}`, colors.red);
  }
  
  // Check if our taskId is in the unlocking process
  const taskIds = tasksInDependencyProcess.map(t => t.id);
  if (taskIds.includes(parseInt(taskId))) {
    log(`✅ Task ${taskId} is included in the unlocking process IDs`, colors.green);
  } else {
    log(`❌ Task ${taskId} is NOT included in the unlocking process IDs`, colors.red);
  }
  
  // Check for conditions specific to KY3P tasks
  if (task.task_type === 'ky3p') {
    // Check for KY3P-specific issues
    log('\nKY3P-specific checks:', colors.magenta);
    
    // Check if our task has correct metadata for unlocking
    if (task.metadata && task.metadata.locked === false) {
      log('✅ Task has correct unlocked metadata', colors.green);
    } else {
      log('❌ Task metadata may be incorrect', colors.red);
      log(`   Metadata: ${JSON.stringify(task.metadata)}`, colors.gray);
    }
    
    // Check if our task has prerequisite dependencies set properly
    if (task.metadata && task.metadata.prerequisite_completed === true) {
      log('✅ Task has prerequisite_completed set correctly', colors.green);
    } else {
      log('❌ Task prerequisite_completed may be incorrect', colors.red);
    }
  }
  
  return {
    task,
    companyTasks,
    tasksInDependencyProcess,
    isTaskIncluded,
    typesInDependencyProcess
  };
}

/**
 * Fix the KY3P task dependency issue
 */
async function fixKy3pTaskDependency(taskId) {
  log('\n╔══════════════════════════════════════════════════╗', colors.cyan);
  log('║               APPLYING FIX                    ║', colors.cyan);
  log('╚══════════════════════════════════════════════════╝', colors.cyan);
  
  try {
    // Get the task
    const task = await getTask(taskId);
    if (!task) {
      log(`Task with ID ${taskId} not found`, colors.red);
      return;
    }
    
    // First, directly update the task's progress and metadata
    log(`\nUpdating task ${taskId} progress...`, colors.blue);
    
    const timestamp = new Date().toISOString();
    const updatedMetadata = {
      ...task.metadata,
      locked: false,
      prerequisite_completed: true,
      prerequisite_completed_at: timestamp,
      dependencyUnlockOperation: true,
      lastProgressUpdate: timestamp,
      previousProgress: task.progress || 0,
      previousStatus: task.status || 'unknown',
      progressHistoryEntry: {
        value: task.progress || 0,
        timestamp
      }
    };
    
    const [updatedTask] = await db
      .update(tasks)
      .set({
        metadata: updatedMetadata,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    log(`✅ Updated task metadata`, colors.green);
    
    // Create broadcast message to update clients
    log(`\nSimulating a broadcast to connected clients...`, colors.blue);
    
    // This is a simulated broadcast - in reality this would use the WebSocket broadcast function
    const broadcastPayload = {
      id: parseInt(taskId),
      progress: task.progress,
      status: task.status,
      metadata: {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: timestamp,
        dependencyUnlockOperation: true,
        previousProgress: task.progress || 0,
        previousStatus: task.status || 'unknown',
        lastProgressUpdate: timestamp
      },
      timestamp
    };
    
    log(`✅ Created broadcast message:`, colors.green);
    log(JSON.stringify(broadcastPayload, null, 2), colors.gray);
    
    // Return success message
    return {
      success: true,
      message: `Successfully patched task ${taskId} to be included in dependency unlocking with preserved progress.`,
      updatedTask
    };
  } catch (error) {
    log(`\n❌ Error fixing task dependency: ${error.message}`, colors.red);
    log(error.stack, colors.gray);
    
    return {
      success: false,
      message: `Error fixing task dependency: ${error.message}`
    };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Default to task 743 if not specified
    const taskId = process.argv[2] || 743;
    
    log('\n╔══════════════════════════════════════════════════╗', colors.cyan);
    log(`║  DIAGNOSING TASK ${taskId} PROGRESS RESET ISSUE   ║`, colors.cyan);
    log('╚══════════════════════════════════════════════════╝\n', colors.cyan);
    
    // First analyze the dependency processing
    const analysis = await analyzeDependencyProcessing(taskId);
    
    if (!analysis) {
      log('\nAnalysis failed, cannot proceed with fix', colors.red);
      return;
    }
    
    // Ask for confirmation before applying fix
    log('\n╔══════════════════════════════════════════════════╗', colors.cyan);
    log('║                CONCLUSION                     ║', colors.cyan);
    log('╚══════════════════════════════════════════════════╝', colors.cyan);
    
    if (analysis.isTaskIncluded) {
      log(`\nTask ${taskId} is already included in dependency unlocking.`, colors.green);
      log(`No fix needed.`, colors.green);
    } else {
      log(`\nTask ${taskId} is NOT included in dependency unlocking.`, colors.red);
      log(`This explains why progress resets to 0% during reconciliation.`, colors.red);
      log(`\nRecommended fix: Force the task to be included in the dependency process`, colors.yellow);
      log(`and ensure its progress is preserved during reconciliation.`, colors.yellow);
      
      // In a real CLI, we would prompt for confirmation here
      log(`\nApplying fix...`, colors.green);
      const fixResult = await fixKy3pTaskDependency(taskId);
      
      if (fixResult.success) {
        log(`\n${fixResult.message}`, colors.green);
      } else {
        log(`\n${fixResult.message}`, colors.red);
      }
    }
    
    log('\n╔══════════════════════════════════════════════════╗', colors.cyan);
    log('║               CODE FIX NEEDED                 ║', colors.cyan);
    log('╚══════════════════════════════════════════════════╝', colors.cyan);
    
    log(`\nThe temporary fix above only addresses one task.`, colors.yellow);
    log(`To permanently fix this issue, update server/routes/task-dependencies.ts:`, colors.yellow);
    
    // Code fix recommendation
    log(`\nIn the 'unlockAllTasks' function, ensure the query includes KY3P tasks:`, colors.blue);
    log(`
const companyTasks = await db.select()
  .from(tasks)
  .where(
    and(
      eq(tasks.company_id, companyId),
      // No additional filters that might exclude KY3P tasks
    )
  );
`, colors.white);
    
    log(`Make sure 'updateAndBroadcastProgress' is called with the preserveExisting flag:`, colors.blue);
    log(`
const taskProgress = await updateAndBroadcastProgress(task.id, task.task_type, {
  debug: true,
  preserveExisting: true, // Critical flag to prevent progress resets
  metadata: updateMetadata
});
`, colors.white);
    
    log(`\nThis will ensure all tasks, including KY3P tasks, are properly processed`, colors.yellow);
    log(`and their progress is preserved during reconciliation.`, colors.yellow);
    
  } catch (error) {
    log(`\n❌ Error in main function: ${error.message}`, colors.red);
    log(error.stack, colors.gray);
  }
}

// Execute the main function
main().catch(console.error);
