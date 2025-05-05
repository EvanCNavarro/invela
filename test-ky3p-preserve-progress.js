/**
 * Enhanced KY3P Progress Preservation Test Script
 * 
 * This script verifies that our KY3P form clearing implementation 
 * correctly preserves progress when the preserveProgress parameter is used.
 */

const KY3P_TASK_ID = 694; // Use an existing KY3P task

/**
 * Get current task progress from the API
 */
async function getTaskProgress(taskId) {
  try {
    console.log(`Getting current progress for task ${taskId}...`);
    
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting task: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
    
    const task = await response.json();
    console.log(`Current task status: ${task.status}, progress: ${task.progress}%`);
    return task;
  } catch (error) {
    console.error('Error getting task progress:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Test preserving progress during form editing
 */
async function testPreserveProgress() {
  try {
    console.log(`Testing progress preservation for KY3P task ${KY3P_TASK_ID}...`);
    
    // Check initial task progress
    const initialTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Initial task progress: ${initialTask.progress}%`);
    
    if (initialTask.progress === 0) {
      console.warn('Task already has 0% progress, this test may not show correct results');
    }
    
    // Call the KY3P clear endpoint with preserveProgress=true parameter
    console.log('Calling KY3P clear endpoint with preserveProgress=true');
    const response = await fetch(`/api/ky3p/clear-fields/${KY3P_TASK_ID}?preserveProgress=true`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ preserveProgress: true })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error clearing KY3P fields: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log('Clear operation with preserveProgress result:', result);
    
    // Check task progress after clear
    const afterTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Task progress after clear with preserveProgress: ${afterTask.progress}%`);
    
    // Verify that progress is still the same as before
    if (afterTask.progress === initialTask.progress) {
      console.log('✅ SUCCESS: Progress was correctly preserved!');
      return { success: true, result, task: afterTask };
    } else {
      console.error(`❌ FAILURE: Progress changed from ${initialTask.progress}% to ${afterTask.progress}%`);
      return { success: false, result, task: afterTask };
    }
  } catch (error) {
    console.error('Error in test:', error);
    return { success: false, error: String(error) };
  }
}

// Make the test function available globally for browser console use
window.testKy3pPreserveProgress = testPreserveProgress;

// Print instructions when script is loaded
console.log(`
=======================================================
KY3P Form Clearing Progress Preservation Test
=======================================================

This script tests the enhanced KY3P form clearing functionality
with the preserveProgress parameter that prevents progress from
being reset to 0% during form editing.

To run the test:
1. Make sure you're logged in
2. Call the test function in your browser console:

   testKy3pPreserveProgress()

The test will check if progress is preserved correctly.
=======================================================
`);
