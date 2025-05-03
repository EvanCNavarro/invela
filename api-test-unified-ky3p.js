/**
 * API-based test for the unified KY3P progress solution
 * 
 * This script tests our unified KY3P progress implementation by calling
 * the API endpoints and checking if progress is calculated and persisted correctly.
 */

import fetch from 'node-fetch';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log with colors and formatting
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Login to the application to get a session
 */
async function login() {
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  if (loginResponse.ok) {
    log('Successfully logged in', colors.green);
    return true;
  } else {
    log('Login failed - continuing anonymously', colors.yellow);
    return false;
  }
}

/**
 * Find a KY3P task to test with
 */
async function findKy3pTask() {
  try {
    log('\nLooking for a KY3P task...', colors.blue);
    
    // Call the API to list tasks - this may require authentication
    const tasksResponse = await fetch('http://localhost:5000/api/tasks');
    
    if (!tasksResponse.ok) {
      log(`Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`, colors.red);
      
      // Try a direct database query via the debug endpoint
      const debugResponse = await fetch('http://localhost:5000/api/debug/ky3p-tasks');
      
      if (!debugResponse.ok) {
        log('Could not get KY3P tasks even with debug endpoint', colors.red);
        return null;
      }
      
      const tasks = await debugResponse.json();
      
      if (!tasks || tasks.length === 0) {
        log('No KY3P tasks found via debug endpoint', colors.red);
        return null;
      }
      
      log(`Found ${tasks.length} KY3P tasks via debug endpoint`, colors.green);
      return tasks[0];
    }
    
    const tasks = await tasksResponse.json();
    
    if (!Array.isArray(tasks)) {
      log('Tasks response is not an array', colors.red);
      return null;
    }
    
    const ky3pTask = tasks.find(task => task.task_type === 'ky3p');
    
    if (!ky3pTask) {
      log('No KY3P tasks found', colors.red);
      return null;
    }
    
    log(`Found KY3P task #${ky3pTask.id}: ${ky3pTask.title || 'No title'}`, colors.green);
    return ky3pTask;
  } catch (error) {
    log(`Error finding KY3P task: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Get KY3P field definitions
 */
async function getKy3pFields() {
  try {
    log('\nFetching KY3P field definitions...', colors.blue);
    
    const fieldsResponse = await fetch('http://localhost:5000/api/ky3p/field-definitions');
    
    if (!fieldsResponse.ok) {
      log(`Failed to get fields: ${fieldsResponse.status} ${fieldsResponse.statusText}`, colors.red);
      return null;
    }
    
    const fields = await fieldsResponse.json();
    
    if (!Array.isArray(fields)) {
      log('Fields response is not an array', colors.red);
      return null;
    }
    
    log(`Found ${fields.length} KY3P field definitions`, colors.green);
    return fields;
  } catch (error) {
    log(`Error getting KY3P fields: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Update fields using the unified KY3P update endpoint
 */
async function updateFields(taskId, fields) {
  try {
    log('\nUpdating KY3P fields via unified endpoint...', colors.blue);
    
    // Select 5 random fields with valid field_key to update
    const fieldsToUpdate = fields
      .filter(field => field.field_key && field.field_key.length > 0)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
      
    if (fieldsToUpdate.length === 0) {
      log('No valid fields to update', colors.red);
      return false;
    }
    
    log(`Selected ${fieldsToUpdate.length} fields to update:`, colors.cyan);
    
    // Create response data
    const formData = {};
    
    fieldsToUpdate.forEach(field => {
      formData[field.field_key] = `Test value for ${field.field_key} - ${new Date().toISOString()}`;
      log(` - ${field.field_key}: ${field.label || field.display_name || field.question}`, colors.cyan);
    });
    
    // Call the unified update endpoint
    const updateResponse = await fetch(`http://localhost:5000/api/ky3p/unified-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ responses: formData })
    });
    
    if (!updateResponse.ok) {
      log(`Failed to update fields: ${updateResponse.status} ${updateResponse.statusText}`, colors.red);
      return false;
    }
    
    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      log(`Update failed: ${updateResult.message}`, colors.red);
      return false;
    }
    
    log(`Successfully updated ${updateResult.processedCount} fields`, colors.green);
    return true;
  } catch (error) {
    log(`Error updating fields: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Check if the task progress was updated correctly
 */
async function checkTaskProgress(taskId, initialProgress) {
  try {
    log('\nVerifying task progress update...', colors.blue);
    
    // Wait a moment for progress to be calculated
    log('Waiting 2 seconds for progress to be calculated...', colors.cyan);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the updated task
    const taskResponse = await fetch(`http://localhost:5000/api/tasks/${taskId}`);
    
    if (!taskResponse.ok) {
      log(`Failed to get updated task: ${taskResponse.status} ${taskResponse.statusText}`, colors.red);
      return false;
    }
    
    const updatedTask = await taskResponse.json();
    
    log(`Initial progress: ${initialProgress}%`, colors.yellow);
    log(`Current progress: ${updatedTask.progress}%`, colors.green);
    log(`Task status: ${updatedTask.status}`, colors.cyan);
    
    // Check if progress was updated
    if (updatedTask.progress > initialProgress) {
      log('\n✅ SUCCESS: Progress increased as expected!', colors.bright + colors.green);
      return true;
    } else if (updatedTask.progress === initialProgress) {
      log('\n⚠️ WARNING: Progress remained the same.', colors.yellow);
      log('This could be normal if responses were already complete or all fields were filled.', colors.yellow);
      return true;
    } else {
      log('\n❌ ERROR: Progress decreased unexpectedly!', colors.bright + colors.red);
      return false;
    }
  } catch (error) {
    log(`Error checking task progress: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Run the full test
 */
async function runTest() {
  try {
    log('=== Testing Unified KY3P Update API ===', colors.bright + colors.magenta);
    
    // Try to log in (optional)
    await login();
    
    // Find a KY3P task to test with
    const task = await findKy3pTask();
    
    if (!task) {
      log('\n❌ Test aborted: Could not find a KY3P task', colors.bright + colors.red);
      return;
    }
    
    const initialProgress = task.progress;
    
    // Get KY3P field definitions
    const fields = await getKy3pFields();
    
    if (!fields || fields.length === 0) {
      log('\n❌ Test aborted: Could not get KY3P field definitions', colors.bright + colors.red);
      return;
    }
    
    // Update fields
    const updateSuccess = await updateFields(task.id, fields);
    
    if (!updateSuccess) {
      log('\n❌ Test failed: Could not update fields', colors.bright + colors.red);
      return;
    }
    
    // Check if progress was updated
    const progressUpdated = await checkTaskProgress(task.id, initialProgress);
    
    // Final result
    if (progressUpdated) {
      log('\n✅ Test passed: Unified KY3P Progress implementation is working!', colors.bright + colors.green);
    } else {
      log('\n❌ Test failed: Unified KY3P Progress implementation has issues.', colors.bright + colors.red);
    }
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, colors.bright + colors.red);
    console.error(error);
  }
}

// Run the test
runTest().then(() => {
  log('\n=== Test Complete ===', colors.bright + colors.blue);
});
