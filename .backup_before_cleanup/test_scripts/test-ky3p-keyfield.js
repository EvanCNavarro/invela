/**
 * Test script for KY3P field key router (keyfield-progress)
 * 
 * This script tests our new KY3P field key implementation that makes KY3P work
 * exactly like KYB forms by using string-based field_key reference instead of
 * numeric field_id references.
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000';

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌ ERROR:' :
                type === 'success' ? '✅ SUCCESS:' :
                type === 'warn' ? '⚠️ WARNING:' : 'ℹ️ INFO:';
  console.log(`${prefix} ${message}`);
}

async function findKy3pTask() {
  try {
    log('Finding a KY3P task to test with...');
    
    // For testing purposes, use a known task ID
    const taskId = 702; // This is a known KY3P task based on logs
    
    log(`Using known KY3P task: ${taskId}`, 'success');
    return { id: taskId };
  } catch (error) {
    log(`Error finding KY3P task: ${error.message}`, 'error');
    return null;
  }
}

async function getKy3pFields() {
  try {
    log('Using sample KY3P field definitions...');
    
    // For testing, use sample KY3P fields with field_key attributes
    const sampleFields = [
      { id: 1, field_key: 'vendor_name', label: 'Vendor Name' },
      { id: 2, field_key: 'vendor_website', label: 'Vendor Website' },
      { id: 3, field_key: 'vendor_address', label: 'Vendor Address' },
      { id: 4, field_key: 'vendor_contact', label: 'Primary Contact' },
      { id: 5, field_key: 'vendor_services', label: 'Services Provided' }
    ];
    
    log(`Using ${sampleFields.length} sample KY3P fields`, 'success');
    return sampleFields;
  } catch (error) {
    log(`Error preparing KY3P fields: ${error.message}`, 'error');
    return [];
  }
}

async function testKeyfieldProgress(taskId, fields) {
  try {
    // Prepare sample form data with 5 random fields
    const sampleFields = fields.slice(0, 5);
    const formData = {};
    
    for (const field of sampleFields) {
      formData[field.field_key] = `Test value for ${field.field_key}`;
    }
    
    log('Testing KY3P keyfield-progress endpoint...');
    log(`Updating ${Object.keys(formData).length} fields for task ${taskId}`);
    
    // Use our new keyfield-progress endpoint
    const response = await axios.post(`${API_URL}/api/ky3p/keyfield-progress`, {
      taskId,
      progress: 60, // 60% progress
      formData
    });
    
    log('Response:', 'success');
    log(JSON.stringify(response.data, null, 2), 'success');
    
    return response.data;
  } catch (error) {
    log(`Error testing keyfield-progress: ${error.message}`, 'error');
    if (error.response) {
      log('Server response:', 'error');
      log(JSON.stringify(error.response.data, null, 2), 'error');
    }
    return null;
  }
}

// Get progress data from the new endpoint
async function getKeyfieldProgress(taskId) {
  try {
    log('Getting KY3P keyfield progress...');
    const response = await axios.get(`${API_URL}/api/ky3p/keyfield-progress/${taskId}`);
    
    log('Response:', 'success');
    log(JSON.stringify(response.data, null, 2), 'success');
    
    return response.data;
  } catch (error) {
    log(`Error getting keyfield progress: ${error.message}`, 'error');
    if (error.response) {
      log('Server response:', 'error');
      log(JSON.stringify(error.response.data, null, 2), 'error');
    }
    return null;
  }
}

async function run() {
  try {
    log('Starting KY3P keyfield router test...');
    
    // Find a KY3P task to test with
    const task = await findKy3pTask();
    if (!task) return;
    
    // Get KY3P field definitions
    const fields = await getKy3pFields();
    if (!fields.length) return;
    
    // Test updating progress using the new keyfield-progress endpoint
    const updateResult = await testKeyfieldProgress(task.id, fields);
    if (!updateResult) return;
    
    // Test getting progress data from the new endpoint
    const progressData = await getKeyfieldProgress(task.id);
    if (!progressData) return;
    
    log('Test completed successfully!', 'success');
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    console.error(error);
  }
}

run();
