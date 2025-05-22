/**
 * Test Task Status/Progress Fix
 * 
 * This script tests the task fix functionality by calling the API endpoint
 * to fix known inconsistent tasks.
 */

// Define tasks with known inconsistencies
const inconsistentTasks = [
  { id: 883, issue: "status='submitted' but progress=0" },
  { id: 884, issue: "status='ready_for_submission' but progress=100" }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Pretty logging function
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Function to test fixing a single task
async function testFixTask(taskId) {
  try {
    log(`Testing fix for task ID: ${taskId}`, colors.cyan);
    
    // Get task before fix
    log(`Fetching current state for task ${taskId}...`, colors.blue);
    const beforeResponse = await fetch(`/api/tasks/${taskId}`);
    const beforeData = await beforeResponse.json();
    
    if (!beforeResponse.ok) {
      log(`Error fetching task ${taskId}: ${beforeData.error || 'Unknown error'}`, colors.red);
      return;
    }
    
    log(`Current task state:`, colors.yellow);
    log(`- Status: ${beforeData.status}`, colors.yellow);
    log(`- Progress: ${beforeData.progress}`, colors.yellow);
    
    // Apply the fix
    log(`Applying fix to task ${taskId}...`, colors.blue);
    const fixResponse = await fetch(`/api/task-fix/${taskId}`);
    const fixData = await fixResponse.json();
    
    if (!fixResponse.ok) {
      log(`Error fixing task ${taskId}: ${fixData.error || 'Unknown error'}`, colors.red);
      return;
    }
    
    log(`Fix result: ${fixData.message}`, colors.green);
    
    // Get task after fix
    log(`Fetching updated state for task ${taskId}...`, colors.blue);
    const afterResponse = await fetch(`/api/tasks/${taskId}`);
    const afterData = await afterResponse.json();
    
    if (!afterResponse.ok) {
      log(`Error fetching updated task ${taskId}: ${afterData.error || 'Unknown error'}`, colors.red);
      return;
    }
    
    log(`Updated task state:`, colors.green);
    log(`- Status: ${afterData.status}`, colors.green);
    log(`- Progress: ${afterData.progress}`, colors.green);
    
    // Verify fix was successful
    const isFixed = 
      (afterData.status === 'submitted' && afterData.progress === 100) ||
      (afterData.progress < 100 && afterData.status !== 'submitted');
    
    if (isFixed) {
      log(`✅ Task ${taskId} successfully fixed!`, colors.green);
    } else {
      log(`❌ Task ${taskId} fix failed or wasn't needed!`, colors.red);
    }
    
    return { taskId, before: beforeData, after: afterData, fixed: isFixed };
  } catch (error) {
    log(`Error testing fix for task ${taskId}: ${error.message}`, colors.red);
    return { taskId, error: error.message };
  }
}

// Function to test batch fix
async function testBatchFix(taskIds) {
  try {
    log(`Testing batch fix for tasks: ${taskIds.join(', ')}`, colors.cyan);
    
    // Apply the batch fix
    log(`Applying batch fix...`, colors.blue);
    const fixResponse = await fetch(`/api/task-fix/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskIds })
    });
    
    const fixData = await fixResponse.json();
    
    if (!fixResponse.ok) {
      log(`Error in batch fix: ${fixData.error || 'Unknown error'}`, colors.red);
      return;
    }
    
    log(`Batch fix results:`, colors.green);
    fixData.results.forEach(result => {
      const statusColor = result.success ? colors.green : colors.red;
      log(`- Task ${result.taskId}: ${result.message || result.error}`, statusColor);
    });
    
    return fixData;
  } catch (error) {
    log(`Error testing batch fix: ${error.message}`, colors.red);
    return { error: error.message };
  }
}

// Main function
async function main() {
  log('🔧 Task Status/Progress Fix Tester', colors.magenta);
  log('===================================', colors.magenta);
  
  // Test individual tasks
  log('\n📋 Testing individual task fixes:', colors.cyan);
  for (const task of inconsistentTasks) {
    log(`\nTesting task ${task.id} (${task.issue})`, colors.yellow);
    await testFixTask(task.id);
  }
  
  // Test batch fix
  log('\n📦 Testing batch fix:', colors.cyan);
  const taskIds = inconsistentTasks.map(task => task.id);
  await testBatchFix(taskIds);
  
  log('\n✨ All tests completed!', colors.magenta);
}

// Run the main function
main().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  console.error(error);
});