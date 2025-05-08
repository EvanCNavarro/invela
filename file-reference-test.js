/**
 * File Reference Test
 * 
 * This script provides a browser-based tool to test if the file references
 * for tasks are working correctly. It uses our new file verification
 * API endpoint to verify proper file reference resolution.
 * 
 * To use: Copy this file's content and run it in the browser console
 * when logged into the application.
 */

// Set the base URL for API requests - needed for browser environment
const BASE_URL = window.location.origin;

async function testFileReference(taskId = 762) {
  try {
    console.log(`Testing file reference for task ${taskId}...`);
    
    // Call our new file verification API to check references
    const response = await fetch(`${BASE_URL}/api/file-verification/${taskId}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`Error verifying file reference for task ${taskId}:`, error);
      return {
        success: false,
        message: 'File verification failed',
        error
      };
    }
    
    const data = await response.json();
    console.log(`File verification result for task ${taskId}:`, data);
    
    // Check if file reference was resolved
    const hasFileReference = data.fileReference && data.fileReference.fileId;
    const hasFileData = data.fileData && data.fileData.id;
    
    // Format a clear summary of the results
    console.log('---------------------------------------');
    console.log('FILE REFERENCE TEST RESULTS:');
    console.log('---------------------------------------');
    console.log(`Task ID: ${taskId}`);
    console.log(`Task Type: ${data.task.task_type}`);
    console.log(`Task Status: ${data.task.status}`);
    console.log(`Has File Reference: ${hasFileReference ? 'YES' : 'NO'}`);
    
    if (hasFileReference) {
      console.log(`File ID: ${data.fileReference.fileId}`);
      console.log(`File Name: ${data.fileReference.fileName || 'N/A'}`);
      console.log(`File Type: ${data.fileReference.fileType || 'N/A'}`);
    }
    
    console.log(`Has File Data: ${hasFileData ? 'YES' : 'NO'}`);
    
    if (hasFileData) {
      console.log(`File Record ID: ${data.fileData.id}`);
      console.log(`File Name: ${data.fileData.name}`);
      console.log(`File Type: ${data.fileData.type}`);
      console.log(`File Size: ${data.fileData.size} bytes`);
    }
    
    console.log('---------------------------------------');
    
    return {
      success: true,
      hasFileReference,
      hasFileData,
      data
    };
  } catch (error) {
    console.error('Error in file reference test:', error);
    return {
      success: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// In a browser environment, this test needs to be run from the console.
// If this script is run directly in Node.js, we'll provide instructions.
if (typeof window === 'undefined') {
  console.log('This script is designed to be run in a browser environment.');
  console.log('Please copy the script content and run it in your browser console when logged into the application.');
} else {
  console.log('File Reference Test Tool Loaded');
  console.log('To run the test, execute: testFileReference(taskId)');
  console.log('Example: testFileReference(762)');
}