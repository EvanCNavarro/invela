/**
 * Test Unified Task Progress System
 * 
 * This script provides a simple way to test the unified task progress calculation
 * system directly from the browser. It helps verify that progress is correctly
 * calculated, persisted to the database, and broadcast via WebSocket.
 * 
 * Usage: Copy and paste this script into your browser console while logged into
 * the application. Then call testTaskProgress() with the appropriate parameters.
 */

async function testTaskProgress(taskId = 702, taskType = 'ky3p') {
  console.log(`Testing task progress for task ${taskId} (${taskType})...`);
  
  try {
    // Step 1: Call the debug endpoint to test progress calculation
    const response = await fetch('/api/debug/test-unified-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        taskType,
        debug: true,
        forceUpdate: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Step 2: Pretty-print the results
    console.log('Task Progress Test Results:');
    console.log('=========================');
    console.log(`Task ID: ${result.taskId}`);
    console.log(`Task Type: ${result.taskType}`);
    console.log(`Initial Progress: ${result.initialProgress}%`);
    console.log(`Initial Status: ${result.initialStatus}`);
    console.log(`Updated Progress: ${result.updatedProgress}%`);
    console.log(`Updated Status: ${result.updatedStatus}`);
    console.log('\nField Counts:');
    console.log(`  - Completed: ${result.fieldCounts.completed}`);
    console.log(`  - Total: ${result.fieldCounts.total}`);
    console.log(`  - Calculated %: ${result.fieldCounts.calculatedPercentage}%`);
    
    if (result.result && result.result.calculationDetails) {
      console.log('\nCalculation Details:');
      console.log(result.result.calculationDetails);
    }
    
    console.log('\nTest completed successfully!');
    return result;
  } catch (error) {
    console.error('Error testing task progress:', error);
    throw error;
  }
}

// Export for use in Node.js environments
if (typeof module !== 'undefined') {
  module.exports = { testTaskProgress };
}

console.log(`
=== Task Progress Testing Utility Loaded ===
Test unified task progress calculation with:

testTaskProgress(taskId, taskType)

Example: testTaskProgress(702, 'ky3p')
`);
