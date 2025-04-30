/**
 * Test script to broadcast a form submission update via WebSocket
 * 
 * This script demonstrates how to broadcast a form submission update
 * to all connected clients to test the FormSubmissionListener component.
 */

import { broadcastFormSubmission } from './dist/server/services/websocket.js';

async function testFormSubmissionBroadcast() {
  console.log('[Test] Broadcasting form submission success event...');
  
  // Example task and form type
  const taskId = 690; // KY3P Task ID
  const formType = 'ky3p'; // KY3P form
  const companyId = 255; // Current company
  
  // Broadcast a success event
  broadcastFormSubmission(
    taskId,
    formType,
    'success',
    companyId,
    {
      submissionDate: new Date().toISOString(),
      unlockedTabs: ['file_vault', 'risk_assessment'],
      fileName: 'KY3P_Submission_690.csv',
      fileId: 1234
    }
  );
  
  console.log('[Test] Form submission success event broadcast complete');
  
  // Wait a few seconds and broadcast an in-progress event
  setTimeout(() => {
    console.log('[Test] Broadcasting form submission in-progress event...');
    
    broadcastFormSubmission(
      taskId,
      formType,
      'in_progress',
      companyId
    );
    
    console.log('[Test] Form submission in-progress event broadcast complete');
  }, 3000);
  
  // Wait a few more seconds and broadcast an error event
  setTimeout(() => {
    console.log('[Test] Broadcasting form submission error event...');
    
    broadcastFormSubmission(
      taskId,
      formType,
      'error',
      companyId,
      {
        error: 'This is a test error message'
      }
    );
    
    console.log('[Test] Form submission error event broadcast complete');
  }, 6000);
}

// Run the test
testFormSubmissionBroadcast()
  .then(() => {
    console.log('[Test] Test completed successfully');
  })
  .catch((error) => {
    console.error('[Test] Test failed with error:', error);
  });