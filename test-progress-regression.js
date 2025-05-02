/**
 * Test Progress Regression Script
 * 
 * This script triggers a controlled test case that reproduces the progress regression
 * issue where progress goes from 1% to 0% when navigating between views.
 * 
 * Instructions:
 * 1. Open a form in the browser
 * 2. Run this script in the browser console
 * 3. Navigate between form and task center
 * 4. Observe logs for progress changes
 */

async function testProgressRegression() {
  // Find or create a test task
  const taskId = await getOrCreateTestTask();
  console.log(`[Test] Using task ID: ${taskId}`);
  
  // Clear all field values to start fresh
  await clearAllFields(taskId);
  console.log(`[Test] Cleared all fields for task ${taskId}`);
  
  // Verify progress is 0%
  const initialProgress = await getTaskProgress(taskId);
  console.log(`[Test] Initial progress: ${initialProgress}%`);
  
  if (initialProgress !== 0) {
    console.error(`[Test] Expected 0% initial progress, got ${initialProgress}%`);
    return;
  }
  
  // Set a single field value to create 1% progress
  await setTestField(taskId);
  console.log(`[Test] Set test field value`);
  
  // Verify progress is now > 0%
  const updatedProgress = await getTaskProgress(taskId);
  console.log(`[Test] Updated progress: ${updatedProgress}%`);
  
  if (updatedProgress === 0) {
    console.error(`[Test] Expected > 0% progress after setting field, still at 0%`);
    return;
  }
  
  console.log(`[Test] Test setup complete. Progress at ${updatedProgress}%.`);
  console.log(`[Test] Now navigate between form view and task center to observe progress changes.`);
  
  // Set up monitoring to detect progress changes
  setupProgressMonitoring(taskId);
}

async function getOrCreateTestTask() {
  // Try to find an existing Open Banking task
  try {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    
    // Look for an Open Banking task
    const openBankingTask = tasks.find(task => task.task_type === 'open_banking');
    
    if (openBankingTask) {
      return openBankingTask.id;
    }
    
    // If no task found, we'll need to create one
    console.log('[Test] No Open Banking task found, please create one first');
    return prompt('Enter a task ID to use for testing:');
  } catch (error) {
    console.error('[Test] Error finding test task:', error);
    return prompt('Enter a task ID to use for testing:');
  }
}

async function clearAllFields(taskId) {
  try {
    const response = await fetch(`/api/open-banking/clear-fields/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('[Test] Error clearing fields:', error);
    return false;
  }
}

async function setTestField(taskId) {
  try {
    // Set a single field value for the open banking form
    const response = await fetch(`/api/open-banking-fields/${taskId}/update-field`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field_key: 'financial_institution_name',
        value: 'Test Bank Name',
        debug: true // Enable extra logging
      })
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('[Test] Error setting test field:', error);
    return false;
  }
}

async function getTaskProgress(taskId) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`);
    const task = await response.json();
    return task.progress;
  } catch (error) {
    console.error('[Test] Error getting task progress:', error);
    return -1;
  }
}

function setupProgressMonitoring(taskId) {
  // Store the last known progress
  let lastProgress = null;
  
  // Poll for progress changes every 2 seconds
  const intervalId = setInterval(async () => {
    const currentProgress = await getTaskProgress(taskId);
    
    if (lastProgress !== null && currentProgress !== lastProgress) {
      const timestamp = new Date().toISOString();
      
      if (currentProgress < lastProgress) {
        console.error(`[Test] 🚨 PROGRESS REGRESSION at ${timestamp}: ${lastProgress}% -> ${currentProgress}%`);
        // Capture the stack trace to see where this is being called from
        console.error('[Test] Stack trace:', new Error().stack);
        
        // Log the URL and view state when regression happens
        console.error('[Test] Current location:', window.location.href);
        console.error('[Test] Current view:', document.title);
      } else {
        console.log(`[Test] Progress changed at ${timestamp}: ${lastProgress}% -> ${currentProgress}%`);
      }
    }
    
    lastProgress = currentProgress;
  }, 2000);
  
  // Set up WebSocket listener to detect real-time progress updates
  setupWebSocketMonitoring(taskId);
  
  console.log('[Test] Progress monitoring activated. Will run until page is refreshed.');
  console.log('[Test] To stop monitoring manually, run: clearInterval(window.progressMonitorInterval)');
  
  // Store the interval ID globally so it can be cleared if needed
  window.progressMonitorInterval = intervalId;
  
  return intervalId;
}

function setupWebSocketMonitoring(taskId) {
  // Intercept WebSocket messages to detect progress updates
  const originalWebSocketSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data) {
    // Call the original function
    originalWebSocketSend.call(this, data);
    
    // Try to parse and log relevant messages
    try {
      const message = JSON.parse(data);
      if (message.type === 'task_update' && message.id === taskId) {
        console.log('[Test] WebSocket sent task update:', message);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  };
  
  // Also monitor incoming messages
  const originalAddEventListener = WebSocket.prototype.addEventListener;
  WebSocket.prototype.addEventListener = function(type, listener, options) {
    if (type === 'message') {
      const wrappedListener = function(event) {
        // Call the original listener
        listener.call(this, event);
        
        // Try to parse and log relevant messages
        try {
          const message = JSON.parse(event.data);
          if ((message.type === 'task_update' || message.payload?.id === taskId) && 
              (message.id === taskId || message.payload?.id === taskId)) {
            console.log('[Test] WebSocket received task update:', message);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log('[Test] WebSocket monitoring activated');
}

// Execute the test
testProgressRegression().then(() => {
  console.log('[Test] Test script initialized');
});
