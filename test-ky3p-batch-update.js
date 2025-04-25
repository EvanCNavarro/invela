/**
 * Test script for KY3P batch update functionality
 * 
 * This script tests the KY3P batch update endpoint by sending a test
 * request to /api/test/ky3p-batch-update/:taskId with sample KYB-style
 * response data and verifying the conversion to KY3P format.
 */

// Sample task ID to test with (modify as needed)
const TEST_TASK_ID = 123;

// Sample KYB-style response data (an object with key-value pairs)
const TEST_DATA = {
  responses: {
    "field_1": "Test value 1",
    "field_2": "Test value 2",
    "field_3": "Test value 3",
    "field_with_comma": "Test, with, commas",
    "field_with_quotes": "Test \"quoted\" value",
    "_metadata": "This should be filtered out",
    "_form_version": "This should be filtered out too"
  }
};

// Function to test the KY3P batch update endpoint
async function testKy3pBatchUpdate() {
  try {
    console.log(`Testing KY3P batch update conversion for task ID: ${TEST_TASK_ID}`);
    console.log('Sample KYB-style data:', TEST_DATA);
    
    const response = await fetch(`/api/test/ky3p-batch-update/${TEST_TASK_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_DATA)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Test failed with error:', errorData);
      return;
    }
    
    const result = await response.json();
    console.log('Conversion result:', result);
    
    console.log('Original format (KYB-style):');
    console.log('- Format:', result.original.format);
    console.log('- Key count:', result.original.keyCount);
    console.log('- Sample keys:', result.original.keys);
    
    console.log('\nConverted format (KY3P-style):');
    console.log('- Format:', result.converted.format);
    console.log('- Response count:', result.converted.responseCount);
    console.log('- Sample items:', JSON.stringify(result.converted.sample, null, 2));
    
    // Validate the conversion
    const success = result.converted.responseCount === Object.keys(TEST_DATA.responses).filter(key => !key.startsWith('_')).length;
    console.log(`\nConversion validation: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (success) {
      console.log('✅ All non-metadata fields were properly converted to KY3P format');
    } else {
      console.log('❌ Conversion failed - response counts do not match expected value');
    }
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

// Run the test
testKy3pBatchUpdate();