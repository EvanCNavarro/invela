/**
 * Test script for manual KY3P progress fix endpoint
 * 
 * This script demonstrates how to use the manual KY3P progress fix endpoint
 * to recalculate and update task progress when needed.
 */

async function testManualKy3pFix() {
  const taskId = 739; // Change this to the ID of a KY3P task that needs fixing
  
  console.log(`Testing manual KY3P fix for task ${taskId}...`);
  
  try {
    // Make the request to the manual fix endpoint
    const response = await fetch(`http://localhost:5000/api/ky3p/manual-fix/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'test-script'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('Manual KY3P fix result:', result);
    console.log(`Previous progress: ${result.previousProgress}%`);
    console.log(`New progress: ${result.newProgress}%`);
    console.log(`Status: ${result.status}`);
    console.log(`Total responses: ${result.completionStats.totalResponses}`);
    console.log(`Completed responses: ${result.completionStats.completedResponses}`);
    
    console.log('\nCheck the UI to see if the progress has been updated in real-time!');
  } catch (error) {
    console.error('Error testing manual KY3P fix:', error.message);
  }
}

testManualKy3pFix();
