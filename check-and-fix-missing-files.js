/**
 * Check and Fix Missing Form Files
 * 
 * This comprehensive utility script provides a robust solution for diagnosing and fixing
 * issues with form files not appearing in the File Vault. It supports all form types:
 * - KYB forms
 * - KY3P forms
 * - Open Banking forms
 * - Card Industry forms
 * 
 * Usage:
 * 1. Run script without parameters to scan and check all tasks
 * 2. Run with ?taskId=X to check a specific task
 * 3. Run with ?fix=true to automatically fix all issues found
 * 4. Run with ?taskId=X&fix=true to fix a specific task
 */

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const specificTaskId = urlParams.get('taskId');
const autoFix = urlParams.get('fix') === 'true';

// Configuration
const DEFAULT_LOOKBACK_DAYS = 30; // How many days back to scan for tasks
const MAX_TASKS_TO_CHECK = 20; // Maximum number of tasks to check in a batch

// Check if a specific task was provided
if (specificTaskId) {
  console.log(`\n🔍 Checking file status for task ID: ${specificTaskId}...`);
  checkTaskFileStatus(specificTaskId);
} else {
  console.log(`\n🔍 Scanning for tasks with missing files (${DEFAULT_LOOKBACK_DAYS} day lookback)...`);
  scanForTasksWithMissingFiles();
}

/**
 * Check if a specific task has a missing file and optionally fix it
 */
async function checkTaskFileStatus(taskId) {
  try {
    // First check the file status
    const response = await fetch(`/api/forms/check-missing-file/${taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`❌ Error checking task ${taskId}: ${data.message || 'Unknown error'}`);
      return;
    }
    
    // Display task information
    console.log(`\n📋 Task Information:`);
    console.log(`Task ID: ${data.taskId}`);
    console.log(`Task Type: ${data.taskType}`);
    console.log(`Has File ID: ${data.hasFileId ? '✅ Yes' : '❌ No'}`);
    console.log(`File Exists: ${data.fileExists ? '✅ Yes' : '❌ No'}`);
    console.log(`Needs Fix: ${data.needsFix ? '⚠️ Yes' : '✅ No'}`);
    
    if (data.fileInfo) {
      console.log(`\n📄 File Information:`);
      console.log(`File ID: ${data.fileInfo.id}`);
      console.log(`File Name: ${data.fileInfo.name}`);
      console.log(`Status: ${data.fileInfo.status}`);
      console.log(`Created: ${new Date(data.fileInfo.created_at).toLocaleString()}`);
    }
    
    // If the task needs a fix and autoFix is enabled, fix it
    if (data.needsFix) {
      if (autoFix) {
        console.log(`\n🔧 Task ${taskId} needs a fix. Automatically fixing...`);
        await fixMissingFile(taskId);
      } else {
        console.log(`\n⚠️ Task ${taskId} is missing its file. Run with ?fix=true to fix it automatically.`);
      }
    } else {
      console.log(`\n✅ Task ${taskId} has no file issues.`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error checking task ${taskId}: ${error.message}`);
  }
}

/**
 * Fix a missing file for a specific task
 */
async function fixMissingFile(taskId) {
  try {
    const response = await fetch(`/api/forms/fix-missing-file/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ File fixed successfully!`);
      console.log(`📄 File ID: ${data.fileId}`);
      console.log(`📄 File Name: ${data.fileName}`);
      return true;
    } else {
      console.error(`❌ Failed to fix file: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing file: ${error.message}`);
    return false;
  }
}

/**
 * Scan for tasks with missing files
 */
async function scanForTasksWithMissingFiles() {
  try {
    // Get all tasks for the current user/company
    const response = await fetch('/api/tasks');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const tasks = await response.json();
    
    // Filter for possibly relevant tasks - completed/submitted tasks from recent time period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_LOOKBACK_DAYS);
    
    const relevantTasks = tasks.filter(task => {
      // Only check completed/submitted tasks
      if (task.status !== 'submitted' && task.status !== 'completed') {
        return false;
      }
      
      // Only check form tasks
      if (!isFormTask(task.task_type)) {
        return false;
      }
      
      // Check if task was updated within the lookback period
      const taskDate = new Date(task.updated_at || task.created_at);
      return taskDate >= cutoffDate;
    });
    
    console.log(`\n🔍 Found ${relevantTasks.length} relevant tasks to check.`);
    
    // Limit number of tasks to check
    const tasksToCheck = relevantTasks.slice(0, MAX_TASKS_TO_CHECK);
    
    if (tasksToCheck.length === 0) {
      console.log('\n✅ No relevant tasks found within the lookback period.');
      return;
    }
    
    // Check each task in sequence
    const results = [];
    for (const task of tasksToCheck) {
      console.log(`\n🔍 Checking task ${task.id} (${task.task_type})...`);
      const result = await checkTaskFileStatus(task.id);
      results.push(result);
    }
    
    // Summarize findings
    const needsFix = results.filter(r => r?.needsFix);
    console.log(`\n📊 Summary:`);
    console.log(`Total tasks checked: ${results.length}`);
    console.log(`Tasks needing fix: ${needsFix.length}`);
    
    if (needsFix.length > 0) {
      console.log(`\n⚠️ The following tasks need fixes:`);
      needsFix.forEach(task => {
        console.log(`- Task ${task.taskId} (${task.taskType})`);
      });
      
      if (autoFix) {
        console.log(`\n🔧 Automatically fixing ${needsFix.length} tasks...`);
        let fixCount = 0;
        
        for (const task of needsFix) {
          console.log(`\n🔧 Fixing task ${task.taskId}...`);
          const success = await fixMissingFile(task.taskId);
          if (success) fixCount++;
        }
        
        console.log(`\n📊 Fix summary: ${fixCount}/${needsFix.length} tasks fixed successfully.`);
      } else {
        console.log(`\n💡 Run again with ?fix=true to automatically fix these issues.`);
      }
    } else {
      console.log(`\n✅ No issues found with any of the checked tasks.`);
    }
  } catch (error) {
    console.error(`❌ Error scanning tasks: ${error.message}`);
  }
}

/**
 * Helper to determine if a task type is a form task
 */
function isFormTask(taskType) {
  const formTaskTypes = [
    'kyb', 'company_kyb',
    'ky3p', 'sp_ky3p_assessment', 'security_assessment', 'security',
    'open_banking', 'open_banking_survey',
    'card', 'company_card'
  ];
  
  return formTaskTypes.includes(taskType);
}
