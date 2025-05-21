/**
 * API-based test for the unified KY3P progress solution
 * 
 * This script tests our unified KY3P progress implementation by calling
 * the API endpoints and checking if progress is calculated and persisted correctly.
 */

const fetch = require('node-fetch');

// ANSI colors for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Login to the application to get a session
 */
async function login() {
  log('Logging in...', colors.blue);
  
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }
  
  const cookies = response.headers.get('set-cookie');
  
  if (!cookies) {
    throw new Error('No cookies returned from login');
  }
  
  log('Login successful!', colors.green);
  return cookies;
}

/**
 * Find a KY3P task to test with
 */
async function findKy3pTask(cookies) {
  log('Looking for a KY3P task...', colors.blue);
  
  const response = await fetch('http://localhost:5000/api/debug/ky3p-tasks', {
    headers: {
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch KY3P tasks: ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.tasks || data.tasks.length === 0) {
    throw new Error('No KY3P tasks found');
  }
  
  // Get the most recently created KY3P task
  const task = data.tasks.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  )[0];
  
  log(`Found KY3P task: #${task.id} - ${task.task_name}`, colors.green);
  return task;
}

/**
 * Get KY3P field definitions
 */
async function getKy3pFields(cookies) {
  log('Getting KY3P field definitions...', colors.blue);
  
  const response = await fetch('http://localhost:5000/api/ky3p/fields', {
    headers: {
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch KY3P fields: ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.fields || data.fields.length === 0) {
    throw new Error('No KY3P fields found');
  }
  
  log(`Found ${data.fields.length} KY3P fields`, colors.green);
  return data.fields;
}

/**
 * Update fields using the unified KY3P update endpoint
 */
async function updateFields(taskId, fields, cookies) {
  log(`Updating KY3P fields for task #${taskId}...`, colors.blue);
  
  // Pick 20 random fields to update
  const fieldsToUpdate = fields
    .sort(() => Math.random() - 0.5)
    .slice(0, 20)
    .map(field => ({
      fieldId: field.id,
      taskId,
      value: `Test value for field ${field.id}`,
      status: 'COMPLETE'
    }));
  
  const response = await fetch(`http://localhost:5000/api/unified-ky3p/update/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      fields: fieldsToUpdate
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update KY3P fields: ${error}`);
  }
  
  const data = await response.json();
  
  log(`Updated ${fieldsToUpdate.length} KY3P fields with status: ${data.success ? 'SUCCESS' : 'FAILURE'}`, 
    data.success ? colors.green : colors.red);
    
  return data;
}

/**
 * Check if the task progress was updated correctly
 */
async function checkTaskProgress(taskId, initialProgress, cookies) {
  log(`Checking task progress for task #${taskId}...`, colors.blue);
  
  const response = await fetch(`http://localhost:5000/api/debug/test-unified-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      taskId,
      taskType: 'ky3p',
      debug: true,
      forceUpdate: false
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check task progress: ${error}`);
  }
  
  const data = await response.json();
  
  const progressChanged = data.updatedProgress !== initialProgress;
  log(`Task #${taskId} progress: ${initialProgress}% -> ${data.updatedProgress}%`, 
    progressChanged ? colors.green : colors.yellow);
  log(`Task #${taskId} status: ${data.initialStatus} -> ${data.updatedStatus}`, 
    data.initialStatus !== data.updatedStatus ? colors.green : colors.yellow);
  
  // Verify if the calculation is correct
  const expectedProgress = Math.round((data.fieldCounts.completed / data.fieldCounts.total) * 100);
  const progressIsCorrect = Math.abs(data.updatedProgress - expectedProgress) <= 1; // Allow for rounding differences
  
  log(`Field counts: ${data.fieldCounts.completed}/${data.fieldCounts.total} = ${expectedProgress}%`, 
    progressIsCorrect ? colors.green : colors.red);
  
  if (!progressIsCorrect) {
    log(`WARNING: Progress doesn't match expected value (${data.updatedProgress}% vs ${expectedProgress}%)`, 
      colors.red);
  }
  
  return {
    success: progressChanged && progressIsCorrect,
    initialProgress,
    updatedProgress: data.updatedProgress,
    expectedProgress,
    fieldCounts: data.fieldCounts
  };
}

/**
 * Run the full test
 */
async function runTest() {
  try {
    log('\n===== TESTING UNIFIED KY3P PROGRESS SYSTEM =====\n', colors.bright + colors.cyan);
    
    // Step 1: Login to get cookies
    const cookies = await login();
    
    // Step 2: Find a KY3P task to test
    const task = await findKy3pTask(cookies);
    const taskId = task.id;
    const initialProgress = task.progress;
    
    log(`\nInitial task state:`, colors.magenta);
    log(`- Task ID: ${taskId}`);
    log(`- Task Name: ${task.task_name}`);
    log(`- Progress: ${initialProgress}%`);
    log(`- Status: ${task.status}\n`);
    
    // Step 3: Get KY3P field definitions
    const fields = await getKy3pFields(cookies);
    
    // Step 4: Update some fields using the unified endpoint
    const updateResult = await updateFields(taskId, fields, cookies);
    
    // Step 5: Check if task progress was updated correctly
    const progressResult = await checkTaskProgress(taskId, initialProgress, cookies);
    
    // Step 6: Print test summary
    log('\n===== TEST SUMMARY =====\n', colors.bright + colors.cyan);
    log(`Task ID: ${taskId}`);
    log(`Fields updated: ${updateResult.updated || 0} (${updateResult.success ? 'SUCCESS' : 'FAILURE'})`);
    log(`Progress change: ${initialProgress}% -> ${progressResult.updatedProgress}%`);
    log(`Progress calculation: ${progressResult.fieldCounts.completed}/${progressResult.fieldCounts.total} = ${progressResult.expectedProgress}%`);
    log(`Progress verification: ${progressResult.success ? 'PASS' : 'FAIL'}`);
    
    if (progressResult.success) {
      log('\n✅ TEST PASSED - Unified KY3P progress system is working correctly!', colors.bright + colors.green);
    } else {
      log('\n❌ TEST FAILED - Progress calculation or persistence not working correctly', colors.bright + colors.red);
    }
    
  } catch (error) {
    log(`\n❌ TEST ERROR: ${error.message}`, colors.bright + colors.red);
    console.error(error);
  }
}

// Run the test
runTest();
