/**
 * Test script for KY3P clear fields with preserveProgress parameter
 * 
 * This script tests both the standard clear behavior (reset progress to 0%)
 * and the new preserve progress behavior (maintain progress value).
 * 
 * Run this script directly in the browser console to verify that our fix works.
 */

const KY3P_TASK_ID = 739; // Use a known KY3P task for testing

/**
 * Test standard clear behavior (should reset progress to 0%)
 */
async function testStandardClear() {
  try {
    console.log(`Testing standard KY3P clear fields (resetting progress) for task ${KY3P_TASK_ID}...`);
    
    // Check initial task progress
    const initialTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Initial task progress: ${initialTask.progress}%`);
    
    // Call the KY3P clear endpoint without preserveProgress parameter
    const response = await fetch(`/api/ky3p/clear-fields/${KY3P_TASK_ID}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error clearing KY3P fields: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log('Standard clear operation result:', result);
    
    // Check task progress after clear
    const afterTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Task progress after standard clear: ${afterTask.progress}%`);
    
    // Verify that progress is now 0%
    if (afterTask.progress === 0) {
      console.log('✅ Standard clear correctly reset progress to 0%');
      return { success: true, result, task: afterTask };
    } else {
      console.error(`❌ Standard clear did not reset progress to 0% (current: ${afterTask.progress}%)`);
      return { success: false, error: 'Progress was not reset to 0%' };
    }
  } catch (error) {
    console.error('Error in KY3P standard clear test:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Test clear with preserveProgress=true (should maintain progress value)
 */
async function testPreserveProgressClear() {
  try {
    console.log(`Testing KY3P clear fields with preserveProgress=true for task ${KY3P_TASK_ID}...`);
    
    // Set some non-zero progress first
    await setTaskProgress(KY3P_TASK_ID, 50);
    
    // Check initial task progress
    const initialTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Initial task progress: ${initialTask.progress}%`);
    
    // Call the KY3P clear endpoint with preserveProgress=true
    const response = await fetch(`/api/ky3p/clear-fields/${KY3P_TASK_ID}?preserveProgress=true`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error clearing KY3P fields with preserveProgress: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log('Preserve progress clear operation result:', result);
    
    // Check task progress after clear
    const afterTask = await getTaskProgress(KY3P_TASK_ID);
    console.log(`Task progress after preserveProgress clear: ${afterTask.progress}%`);
    
    // Verify that progress is still the same
    if (afterTask.progress === initialTask.progress) {
      console.log(`✅ Clear with preserveProgress correctly maintained progress at ${afterTask.progress}%`);
      return { success: true, result, task: afterTask };
    } else {
      console.error(`❌ Clear with preserveProgress did not maintain progress (before: ${initialTask.progress}%, after: ${afterTask.progress}%)`);
      return { success: false, error: 'Progress was not preserved' };
    }
  } catch (error) {
    console.error('Error in KY3P preserve progress clear test:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Helper function to get task progress
 */
async function getTaskProgress(taskId) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Helper function to set task progress (for testing)
 */
async function setTaskProgress(taskId, progress) {
  try {
    const response = await fetch(`/api/tasks/${taskId}/progress`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ progress })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set task progress: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error setting task ${taskId} progress:`, error);
    throw error;
  }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('=== KY3P Clear Fields Test Suite ===');
  
  console.log('\n1. Testing standard clear (should reset progress to 0%)');
  const standardResult = await testStandardClear();
  
  console.log('\n2. Testing clear with preserveProgress=true (should maintain progress)');
  const preserveResult = await testPreserveProgressClear();
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Standard clear test: ${standardResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Preserve progress test: ${preserveResult.success ? '✅ PASS' : '❌ FAIL'}`);
  
  return {
    standardClear: standardResult,
    preserveProgressClear: preserveResult,
    allPassed: standardResult.success && preserveResult.success
  };
}

// Make the tests available globally
window.testKy3pClear = testStandardClear;
window.testKy3pPreserveProgressClear = testPreserveProgressClear;
window.runAllKy3pClearTests = runAllTests;

// Print instructions
console.log(`
=======================================================
KY3P Clear Fields Test Utility
=======================================================

To test KY3P form clearing functionality, run one of these functions in the browser console:

1. Test standard clear (resets progress to 0%):
   window.testKy3pClear()

2. Test clear with preserveProgress=true (maintains progress):
   window.testKy3pPreserveProgressClear()

3. Run all tests in sequence:
   window.runAllKy3pClearTests()

Current task ID: ${KY3P_TASK_ID} (KY3P task)
=======================================================
`);
