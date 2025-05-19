/**
 * Test script for account setup functionality
 * 
 * This script tests the invitation-based registration flow
 * by using our test user and invitation created in the database.
 */
const axios = require('axios');

// Test data for registration
const setupData = {
  email: 'test.register@example.com',
  password: 'SecurePassword123!', 
  fullName: 'Test Registration User',
  firstName: 'Test',
  lastName: 'User',
  invitationCode: 'TEST123'
};

async function testAccountSetup() {
  console.log('Testing account setup with:', setupData);
  
  try {
    const response = await axios.post('http://localhost:5000/api/account/setup', setupData);
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Account setup successful!');
      
      // Check if automatic login worked
      if (response.data.sessionCreated === false) {
        console.log('⚠️ Automatic login did not occur - this is expected in some cases');
      }
      
      return true;
    } else {
      console.log('❌ Account setup failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing account setup:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Message:', error.message);
    }
    return false;
  }
}

// Execute the test
testAccountSetup()
  .then(success => {
    console.log('\nTest completed.');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });