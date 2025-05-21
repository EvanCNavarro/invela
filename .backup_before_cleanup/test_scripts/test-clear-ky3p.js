/**
 * Test script for KY3P form clearing functionality
 * 
 * This script tests the improved KY3P form clearing functionality using 
 * the dedicated endpoint.
 */

// The KY3P task ID to test
const TASK_ID = 658; 

async function testKy3pClear() {
  try {
    console.log(`Testing KY3P clear fields for task ${TASK_ID}...`);
    
    // Call the dedicated KY3P clear endpoint
    const response = await fetch(`/api/ky3p/clear-fields/${TASK_ID}`, {
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
    console.log('Clear operation successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error in KY3P clear test:', error);
    return { success: false, error: String(error) };
  }
}

// Export the test function so it can be called from the browser console
window.testKy3pClear = testKy3pClear;

// Print instructions
console.log(`
=======================================================
KY3P Clear Fields Test Utility
=======================================================

To test KY3P form clearing, run this script in the browser 
while viewing a KY3P form task, then:

1. Fill out some form fields
2. Open your browser console
3. Run the following command:
   
   testKy3pClear()
   
4. Check if the form fields are cleared
5. Check if the form section navigation returns to the first section

=======================================================
`);