/**
 * Form Submission Test Script (API-based) - ESM Version
 * 
 * This script tests the KY3P form submission process by making an API request.
 */

import fetch from 'node-fetch';

// Configuration
const taskId = 795; // KY3P task we've been testing with
const formType = 'ky3p';

async function testKY3PSubmission() {
  try {
    console.log(`\n===== KY3P FORM SUBMISSION TEST =====\n`);
    console.log(`Testing KY3P form submission for task ${taskId}...`);
    
    // First, check the current task status via API
    console.log('Checking current task status...');
    // Use the full URL (with protocol and hostname)
    const apiBaseUrl = 'https://9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev';
    const taskResponse = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`);
    
    if (!taskResponse.ok) {
      console.error(`Failed to get task ${taskId}: ${taskResponse.status} ${taskResponse.statusText}`);
      return;
    }
    
    const taskData = await taskResponse.json();
    console.log('Current task status:', {
      id: taskData.id,
      status: taskData.status,
      progress: taskData.progress
    });
    
    // Create sample KY3P form data (minimal set for testing)
    console.log('Preparing test form data...');
    const formData = {
      fields: {
        accessManagement: { status: 'COMPLETE', value: 'Yes' },
        accountManagement: { status: 'COMPLETE', value: 'Yes' },
        applicationControls: { status: 'COMPLETE', value: 'Yes' },
        auditTrails: { status: 'COMPLETE', value: 'Yes' },
        authentication: { status: 'COMPLETE', value: 'Yes' }
      }
    };
    
    // First update the form fields
    console.log('Updating form fields...');
    const updateResponse = await fetch(`${apiBaseUrl}/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!updateResponse.ok) {
      console.error(`Field update failed: ${updateResponse.status} ${updateResponse.statusText}`);
      const updateError = await updateResponse.text();
      console.error('Error details:', updateError);
      return;
    }
    
    const updateResult = await updateResponse.json();
    console.log('Field update result:', updateResult);
    
    // Then submit the form
    console.log('\nSubmitting the form...');
    const submitResponse = await fetch(`${apiBaseUrl}/api/forms/${formType}/submit/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: {} }) // Empty form data since we already set fields
    });
    
    if (!submitResponse.ok) {
      console.error(`Form submission failed: ${submitResponse.status} ${submitResponse.statusText}`);
      const submitError = await submitResponse.text();
      console.error('Error details:', submitError);
      return;
    }
    
    const submitResult = await submitResponse.json();
    console.log('Submission result:', submitResult);
    
    // Check task status after submission
    console.log('\nChecking task status after submission...');
    const updatedTaskResponse = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`);
    
    if (!updatedTaskResponse.ok) {
      console.error(`Failed to get updated task: ${updatedTaskResponse.status}`);
      return;
    }
    
    const updatedTaskData = await updatedTaskResponse.json();
    console.log('Task status after submission:', {
      id: updatedTaskData.id,
      status: updatedTaskData.status,
      progress: updatedTaskData.progress
    });
    
    // Verify task status and progress
    if (updatedTaskData.status === 'submitted' && updatedTaskData.progress === 100) {
      console.log('\n✅ TEST PASSED: Task correctly updated to submitted with 100% progress!');
    } else {
      console.log('\n❌ TEST FAILED: Task not updated correctly!');
      console.log('Expected: status=submitted, progress=100');
      console.log(`Actual: status=${updatedTaskData.status}, progress=${updatedTaskData.progress}`);
    }
    
    console.log('\n===== TEST COMPLETED =====\n');
    
  } catch (error) {
    console.error('Error in form submission test:', error);
  }
}

// Run the test
testKY3PSubmission();