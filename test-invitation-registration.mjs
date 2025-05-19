/**
 * Test Invitation-Based Registration System
 * 
 * This script tests the new user registration flow using an invitation code
 * that's already in the database.
 */
import axios from 'axios';

// Test data for registration with the existing invitation
const registrationData = {
  email: 'test.register@example.com', // This email matches our invitation
  password: 'SecurePassword123!',
  fullName: 'Test Registration User',
  firstName: 'Test',
  lastName: 'User',
  invitationCode: 'TEST123' // This code matches our invitation
};

async function validateInvitationCode() {
  console.log('Testing invitation code validation...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/validate-invitation', {
      email: registrationData.email,
      invitationCode: registrationData.invitationCode
    });
    
    console.log('Validation response status:', response.status);
    console.log('Validation response data:', JSON.stringify(response.data, null, 2));
    
    return response.data.success;
  } catch (error) {
    console.error('Error validating invitation code:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Message:', error.message);
    }
    return false;
  }
}

async function registerUser() {
  console.log('Testing user registration...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/register', registrationData);
    
    console.log('Registration response status:', response.status);
    console.log('Registration response data:', JSON.stringify(response.data, null, 2));
    
    return response.data.success;
  } catch (error) {
    console.error('Error during registration:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Message:', error.message);
    }
    return false;
  }
}

async function runTests() {
  console.log('Starting invitation-based registration tests...');
  
  // Step 1: Validate the invitation code
  const isValidInvitation = await validateInvitationCode();
  if (!isValidInvitation) {
    console.error('❌ Invitation validation failed. Stopping tests.');
    return;
  }
  
  console.log('✅ Invitation code validation successful!');
  
  // Step 2: Register the user
  const isRegistrationSuccessful = await registerUser();
  if (!isRegistrationSuccessful) {
    console.error('❌ User registration failed.');
    return;
  }
  
  console.log('✅ User registration successful!');
  console.log('All tests completed successfully!');
}

// Run the tests
runTests()
  .then(() => {
    console.log('Tests completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });