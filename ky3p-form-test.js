/**
 * KY3P Form Test Tool
 * 
 * This script provides a simple browser-based tool to test if KY3P forms
 * are loading correctly after our fixes. It will verify that the circular reference
 * is resolved and that file references are working.
 * 
 * To use: Copy this file's content and run it in the browser console
 * when logged into the application on a KY3P task page.
 */

const BASE_URL = window.location.origin;

/**
 * Test KY3P form loading
 * @param {number} taskId - The task ID to test
 */
async function testKy3pForm(taskId = 763) {
  console.log(`Testing KY3P form for task ${taskId}...`);
  
  // Step 1: Check current page & element states
  const currentUrl = window.location.pathname;
  console.log(`Current page: ${currentUrl}`);
  
  const formExists = document.querySelector('.universal-form') !== null;
  console.log(`Universal form exists on page: ${formExists}`);
  
  if (!formExists) {
    console.log('Form not found on page. Navigate to the KY3P task page and try again.');
    return;
  }
  
  // Step 2: Check for error markers that would indicate our circular reference issue
  const hasDataLoadedErrors = document.querySelectorAll('.error-message').length > 0;
  const errorMessages = Array.from(document.querySelectorAll('.error-message')).map(el => el.textContent);
  
  console.log(`Form has visible errors: ${hasDataLoadedErrors}`);
  if (errorMessages.length > 0) {
    console.log('Error messages found:');
    errorMessages.forEach(msg => console.log(`- ${msg}`));
  }
  
  // Step 3: Test file reference API
  try {
    console.log('Testing file reference API...');
    const response = await fetch(`${BASE_URL}/api/file-verification/${taskId}`);
    
    if (!response.ok) {
      console.error(`Error checking file reference: ${response.status} - ${response.statusText}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('File reference test result:', data);
    
    // Check file reference status
    const hasFileReference = !!(data.fileReference && data.fileReference.fileId);
    const hasFileData = !!(data.fileData && data.fileData.id);
    
    console.log('---------------------------------');
    console.log('FILE REFERENCE STATUS:');
    console.log('---------------------------------');
    console.log(`Task ID: ${taskId}`);
    console.log(`Task Type: ${data.task?.task_type || 'Unknown'}`);
    console.log(`Has File Reference: ${hasFileReference ? 'YES' : 'NO'}`);
    console.log(`Has File Data: ${hasFileData ? 'YES' : 'NO'}`);
    
    if (hasFileReference) {
      console.log(`File ID: ${data.fileReference.fileId}`);
      console.log(`File Name: ${data.fileReference.fileName || 'N/A'}`);
    }
    
    if (hasFileData) {
      console.log(`File Data ID: ${data.fileData.id}`);
      console.log(`File Name: ${data.fileData.name}`);
      console.log(`File Type: ${data.fileData.type}`);
    }
    console.log('---------------------------------');
    
    // Return summary
    return {
      formExists,
      hasErrors: hasDataLoadedErrors,
      errorMessages,
      fileReferenceWorks: hasFileReference || hasFileData,
      fileReference: data.fileReference,
      fileData: data.fileData
    };
  } catch (error) {
    console.error('Error testing KY3P form:', error);
    return {
      formExists,
      hasErrors: hasDataLoadedErrors,
      errorMessages,
      fileReferenceWorks: false,
      error: error.toString()
    };
  }
}

// Display help message when loaded
console.log('---------------------------------');
console.log('KY3P FORM TESTING TOOL');
console.log('---------------------------------');
console.log('This tool helps test KY3P form loading after our fixes.');
console.log('To use, navigate to a KY3P task page and run:');
console.log('testKy3pForm(taskId)');
console.log('Example: testKy3pForm(763)');
console.log('---------------------------------');