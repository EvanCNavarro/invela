/**
 * Test Improved WebSocket Implementation
 * 
 * This script tests our enhanced WebSocket implementation for form submission broadcasts.
 * It sends test messages using the new WebSocket service to verify real-time updates.
 */

// Import our enhanced WebSocket service
const WebSocketService = require('./server/services/websocket-service');

/**
 * Test broadcasting form submission completed event
 */
async function testFormSubmissionBroadcast() {
  console.log('\n=== Testing Form Submission Broadcast ===');
  
  try {
    // Use a test task ID, form type, and company ID
    const taskId = 999;
    const formType = 'kyb';
    const companyId = 279;
    
    console.log(`Broadcasting form_submission_completed for task ${taskId}, form ${formType}, company ${companyId}`);
    
    // Call the WebSocket service to broadcast the event
    const result = WebSocketService.broadcastFormSubmissionCompleted(taskId, formType, companyId);
    
    console.log('Broadcasting successful:', result);
    console.log('Check your browser console for WebSocket messages!');
    
    return { success: true, message: 'Form submission broadcast test completed' };
  } catch (error) {
    console.error('Error in form submission broadcast test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test broadcasting task update event
 */
async function testTaskUpdateBroadcast() {
  console.log('\n=== Testing Task Update Broadcast ===');
  
  try {
    // Use a test task
    const task = {
      id: 998,
      status: 'submitted',
      progress: 100,
      metadata: {
        formType: 'kyb',
        submissionDate: new Date().toISOString(),
        testData: true
      }
    };
    
    console.log(`Broadcasting task_update for task ${task.id}, status ${task.status}, progress ${task.progress}`);
    
    // Call the WebSocket service to broadcast the event
    const result = WebSocketService.broadcastTaskUpdate(task);
    
    console.log('Broadcasting successful:', result);
    console.log('Check your browser console for WebSocket messages!');
    
    return { success: true, message: 'Task update broadcast test completed' };
  } catch (error) {
    console.error('Error in task update broadcast test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test broadcasting company tabs update event
 */
async function testCompanyTabsUpdateBroadcast() {
  console.log('\n=== Testing Company Tabs Update Broadcast ===');
  
  try {
    // Use a test company ID and tabs
    const companyId = 279;
    const availableTabs = ['task-center', 'file-vault', 'dashboard', 'insights'];
    
    console.log(`Broadcasting company_tabs_updated for company ${companyId} with tabs:`, availableTabs);
    
    // Call the WebSocket service to broadcast the event
    const result = WebSocketService.broadcastCompanyTabsUpdate(companyId, availableTabs);
    
    console.log('Broadcasting successful:', result);
    console.log('Check your browser console for WebSocket messages!');
    
    return { success: true, message: 'Company tabs update broadcast test completed' };
  } catch (error) {
    console.error('Error in company tabs update broadcast test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Starting WebSocket implementation tests...');
  
  // Run form submission broadcast test
  const formSubmissionResult = await testFormSubmissionBroadcast();
  console.log('Form submission broadcast result:', formSubmissionResult);
  
  // Run task update broadcast test
  const taskUpdateResult = await testTaskUpdateBroadcast();
  console.log('Task update broadcast result:', taskUpdateResult);
  
  // Run company tabs update broadcast test
  const companyTabsResult = await testCompanyTabsUpdateBroadcast();
  console.log('Company tabs update broadcast result:', companyTabsResult);
  
  console.log('\nAll tests completed!');
}

// Run the tests
runAllTests()
  .then(() => console.log('Tests finished successfully'))
  .catch(error => console.error('Error running tests:', error));