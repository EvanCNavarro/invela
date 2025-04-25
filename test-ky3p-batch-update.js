/**
 * Test script for KY3P batch update functionality
 * 
 * This script tests the new ky3p-batch-update.ts component that standardizes the format
 * between KY3P and KYB form services for demo auto-fill compatibility.
 * 
 * Usage: node test-ky3p-batch-update.js [taskId]
 * If no taskId is provided, it will use 620 as the default test task.
 */

// Import required modules
const fetch = require('node-fetch');

// Get the task ID from command line arguments
const taskId = process.argv[2] || 620;

// Sample form data in KYB format (object format)
const sampleFormData = {
  'organization_name': 'Demo Organization',
  'organization_type': 'Corporation',
  'security_controls_overview': 'Our security controls include firewalls, IDS/IPS, access controls, and encryption.',
  'incident_response_plan': 'Yes',
  'incident_response_details': 'We have a documented IR plan with regular testing.',
  'security_certifications': 'ISO 27001, SOC 2',
  'data_encryption_controls': 'Data is encrypted both at rest and in transit using industry standard encryption.',
  'access_control_policies': 'Role-based access control is implemented across all systems.',
  'third_party_risk_management': 'We have a formal vendor risk management program.',
  'network_security_measures': 'Network is segmented with firewalls, VPNs for remote access, and regular scans.',
  'physical_security_controls': 'Our facilities have 24/7 security monitoring, badge access, and visitor management.',
  // Include metadata fields to test they're properly filtered
  '_lastSaved': new Date().toISOString(),
  '_formVersion': '1.0',
  'taskId': taskId
};

async function runTest() {
  console.log(`\n--- KY3P Batch Update Test ---`);
  console.log(`Testing with task ID: ${taskId}`);
  
  try {
    // First, test the format conversion using our test endpoint
    console.log('\n1. Testing format conversion...');
    const testResponse = await fetch(`http://localhost:5000/api/test/ky3p-batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responses: sampleFormData
      }),
    });
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Test endpoint failed: ${testResponse.status} - ${errorText}`);
    }
    
    const testResult = await testResponse.json();
    console.log('   ✓ Format conversion test successful');
    console.log('     Original keys:', testResult.original.keyCount);
    console.log('     Converted responses:', testResult.converted.responseCount);
    console.log('     Sample converted data:', JSON.stringify(testResult.converted.sample[0], null, 2));
    
    // Next, test the actual batch update helper via our API
    console.log('\n2. Testing actual batch update...');
    const updateResponse = await fetch(`http://localhost:5000/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responses: sampleFormData
      }),
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Batch update failed: ${updateResponse.status} - ${errorText}`);
    }
    
    console.log('   ✓ Batch update successful');
    
    // Finally, fetch the responses to verify they were saved
    console.log('\n3. Verifying saved responses...');
    const verifyResponse = await fetch(`http://localhost:5000/api/ky3p/progress/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      throw new Error(`Verification failed: ${verifyResponse.status} - ${errorText}`);
    }
    
    const verifyResult = await verifyResponse.json();
    console.log('   ✓ Verification successful');
    console.log(`     Progress: ${verifyResult.progress}%`);
    console.log(`     Field count: ${Object.keys(verifyResult.formData || {}).length}`);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runTest();